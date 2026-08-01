import {
  addDoc,
  collection,
  doc,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";
import { appendLongitudinalEvent } from "@/services/longitudinalHistoryService";
import { readQuery, trackWrite } from "@/repositories/firestoreRepository";
import { CACHE_TTL, getOrFetch, invalidateCachePrefix } from "@/utils/requestCache";

const GOALS_COLLECTION = "therapy_goals";

export async function createTherapyGoal(data = {}) {
  if (!data.pacienteUid || !data.terapiaId || !data.title) {
    throw new Error("Faltan datos para crear el objetivo.");
  }

  const payload = {
    pacienteUid: data.pacienteUid,
    pacienteNombre: data.pacienteNombre || "",
    terapeutaId: data.terapeutaId || "",
    terapeutaNombre: data.terapeutaNombre || "",
    terapiaId: data.terapiaId,
    title: data.title,
    description: data.description || "",
    category: data.category || "Proceso terapéutico",
    targetDate: data.targetDate || "",
    progress: Number(data.progress || 0),
    status: "active",
    createdBy: auth.currentUser?.uid || data.pacienteUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await trackWrite({
    resource: GOALS_COLLECTION,
    source: "createTherapyGoal",
    operation: "addDoc",
    write: () => addDoc(collection(db, GOALS_COLLECTION), payload),
  });
  const goal = { id: docRef.id, ...payload };
  invalidateCachePrefix("goals:");

  await safelyAppendGoalEvent({
    eventType: "goal_created",
    title: "Objetivo terapéutico creado",
    summary: `Se creó el objetivo: ${payload.title}.`,
    goal,
  });

  return goal;
}

export async function getGoalsByPatient(pacienteUid, options = {}) {
  if (!pacienteUid) {
    return [];
  }

  return getOrFetch({
    key: `goals:patient:${pacienteUid}`,
    ttl: CACHE_TTL.CLINICAL_LIST,
    force: options.force,
    resource: GOALS_COLLECTION,
    source: "getGoalsByPatient",
    fetcher: async () => {
      const snapshot = await readQuery(
        query(collection(db, GOALS_COLLECTION), where("pacienteUid", "==", pacienteUid)),
        { resource: GOALS_COLLECTION, source: "getGoalsByPatient" }
      );
      return sortGoals(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
  });
}

export async function getGoalsByTherapist(terapeutaId, options = {}) {
  if (!terapeutaId) {
    return [];
  }

  return getOrFetch({
    key: `goals:therapist:${terapeutaId}`,
    ttl: CACHE_TTL.CLINICAL_LIST,
    force: options.force,
    resource: GOALS_COLLECTION,
    source: "getGoalsByTherapist",
    fetcher: async () => {
      const snapshot = await readQuery(
        query(collection(db, GOALS_COLLECTION), where("terapeutaId", "==", terapeutaId)),
        { resource: GOALS_COLLECTION, source: "getGoalsByTherapist" }
      );
      return sortGoals(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
  });
}

export async function updateTherapyGoalProgress({
  goal,
  progress,
  status,
  note = "",
}) {
  if (!goal?.id) {
    throw new Error("Falta el objetivo a actualizar.");
  }

  const normalizedProgress = Math.max(0, Math.min(100, Number(progress || 0)));
  const nextStatus = status || (normalizedProgress >= 100 ? "achieved" : "active");
  const goalRef = doc(db, GOALS_COLLECTION, goal.id);

  await trackWrite({
    resource: GOALS_COLLECTION,
    source: "updateTherapyGoalProgress",
    operation: "updateDoc",
    write: () => updateDoc(goalRef, {
      progress: normalizedProgress,
      status: nextStatus,
      lastNote: note,
      achievedAt: nextStatus === "achieved" ? new Date().toISOString() : "",
      updatedAt: serverTimestamp(),
    }),
  });
  invalidateCachePrefix("goals:");

  const updatedGoal = {
    ...goal,
    progress: normalizedProgress,
    status: nextStatus,
    lastNote: note,
  };

  await safelyAppendGoalEvent({
    eventType: nextStatus === "achieved" ? "goal_achieved" : "goal_updated",
    title:
      nextStatus === "achieved"
        ? "Objetivo terapéutico alcanzado"
        : "Avance de objetivo actualizado",
    summary:
      nextStatus === "achieved"
        ? `Se alcanzó el objetivo: ${goal.title}.`
        : `El objetivo "${goal.title}" avanzó a ${normalizedProgress}%.`,
    goal: updatedGoal,
  });

  return updatedGoal;
}

function sortGoals(items = []) {
  return items.sort((a, b) => toTime(b.updatedAt || b.createdAt) - toTime(a.updatedAt || a.createdAt));
}

function toTime(value) {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

async function safelyAppendGoalEvent({ eventType, title, summary, goal }) {
  if (!goal?.pacienteUid || !eventType) {
    return;
  }

  try {
    await appendLongitudinalEvent({
      pacienteUid: goal.pacienteUid,
      eventType,
      sourceType: "therapy_goal",
      sourceId: goal.id || "",
      terapiaId: goal.terapiaId || "",
      title,
      summary,
      createdBy: auth.currentUser?.uid || goal.pacienteUid,
      metadata: {
        goalId: goal.id || "",
        terapeutaId: goal.terapeutaId || "",
        terapeutaNombre: goal.terapeutaNombre || "",
        category: goal.category || "",
        progress: Number(goal.progress || 0),
        status: goal.status || "",
      },
    });
  } catch (error) {
    console.warn("Could not append longitudinal goal event:", error);
  }
}
