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

const EXERCISES_COLLECTION = "exercises";

export async function createExercise(data = {}) {
  if (!data.pacienteUid || !data.terapeutaId || !data.terapiaId) {
    throw new Error("Faltan datos para asignar el ejercicio.");
  }

  const payload = {
    pacienteUid: data.pacienteUid,
    pacienteNombre: data.pacienteNombre || "",
    terapeutaId: data.terapeutaId,
    terapeutaNombre: data.terapeutaNombre || "",
    terapiaId: data.terapiaId,
    title: data.title || "",
    instructions: data.instructions || "",
    category: data.category || "Seguimiento",
    frequency: data.frequency || "",
    dueDate: data.dueDate || "",
    status: "assigned",
    patientNotes: "",
    createdBy: auth.currentUser?.uid || data.terapeutaId,
    assignedAt: new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await trackWrite({
    resource: EXERCISES_COLLECTION,
    source: "createExercise",
    operation: "addDoc",
    write: () => addDoc(collection(db, EXERCISES_COLLECTION), payload),
  });
  const exercise = { id: docRef.id, ...payload };
  invalidateCachePrefix("exercises:");

  await safelyAppendExerciseEvent({
    eventType: "exercise_assigned",
    title: "Ejercicio asignado",
    summary: `${payload.terapeutaNombre || "El psicólogo"} asignó: ${payload.title}.`,
    exercise,
  });

  return exercise;
}

export async function getExercisesByPatient(pacienteUid, options = {}) {
  if (!pacienteUid) {
    return [];
  }

  return getOrFetch({
    key: `exercises:patient:${pacienteUid}`,
    ttl: CACHE_TTL.CLINICAL_LIST,
    force: options.force,
    resource: EXERCISES_COLLECTION,
    source: "getExercisesByPatient",
    fetcher: async () => {
      const snapshot = await readQuery(
        query(collection(db, EXERCISES_COLLECTION), where("pacienteUid", "==", pacienteUid)),
        { resource: EXERCISES_COLLECTION, source: "getExercisesByPatient" }
      );
      return sortExercises(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
  });
}

export async function getExercisesByTherapist(terapeutaId, options = {}) {
  if (!terapeutaId) {
    return [];
  }

  return getOrFetch({
    key: `exercises:therapist:${terapeutaId}`,
    ttl: CACHE_TTL.CLINICAL_LIST,
    force: options.force,
    resource: EXERCISES_COLLECTION,
    source: "getExercisesByTherapist",
    fetcher: async () => {
      const snapshot = await readQuery(
        query(collection(db, EXERCISES_COLLECTION), where("terapeutaId", "==", terapeutaId)),
        { resource: EXERCISES_COLLECTION, source: "getExercisesByTherapist" }
      );
      return sortExercises(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
  });
}

export async function completeExercise({ exerciseId, patientNotes = "" }) {
  if (!exerciseId) {
    throw new Error("Falta el ejercicio a completar.");
  }

  const exerciseRef = doc(db, EXERCISES_COLLECTION, exerciseId);
  const completedAt = new Date().toISOString();

  await trackWrite({
    resource: EXERCISES_COLLECTION,
    source: "completeExercise",
    operation: "updateDoc",
    write: () => updateDoc(exerciseRef, {
      status: "completed",
      patientNotes,
      completedAt,
      updatedAt: serverTimestamp(),
    }),
  });
  invalidateCachePrefix("exercises:");

  return {
    id: exerciseId,
    status: "completed",
    patientNotes,
    completedAt,
  };
}

export async function appendExerciseCompletedEvent(exercise = {}) {
  await safelyAppendExerciseEvent({
    eventType: "exercise_completed",
    title: "Ejercicio completado",
    summary: `Se completó el ejercicio: ${exercise.title || "Ejercicio"}.`,
    exercise,
  });
}

function sortExercises(items = []) {
  return items.sort((a, b) => toTime(b.assignedAt) - toTime(a.assignedAt));
}

function toTime(value) {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

async function safelyAppendExerciseEvent({ eventType, title, summary, exercise }) {
  if (!exercise?.pacienteUid || !eventType) {
    return;
  }

  try {
    await appendLongitudinalEvent({
      pacienteUid: exercise.pacienteUid,
      eventType,
      sourceType: "exercise",
      sourceId: exercise.id || "",
      terapiaId: exercise.terapiaId || "",
      title,
      summary,
      createdBy: auth.currentUser?.uid || exercise.pacienteUid,
      metadata: {
        exerciseId: exercise.id || "",
        terapeutaId: exercise.terapeutaId || "",
        terapeutaNombre: exercise.terapeutaNombre || "",
        category: exercise.category || "",
        dueDate: exercise.dueDate || "",
        status: exercise.status || "",
      },
    });
  } catch (error) {
    console.warn("Could not append longitudinal exercise event:", error);
  }
}
