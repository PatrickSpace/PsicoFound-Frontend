import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import { callFollowup } from "@/services/followupService";

const CHECKINS_COLLECTION = "emotional_checkins";

export async function createEmotionalCheckin(data = {}) {
  if (!data.terapiaId || !data.requestId || !data.mood) {
    throw new Error("Faltan datos para registrar el estado emocional.");
  }

  return callFollowup("createEmotionalCheckin", {
    mode: "patient",
    requestId: data.requestId,
    terapiaId: data.terapiaId,
    mood: data.mood,
    intensity: Number(data.intensity || 5),
    energy: Number(data.energy || 5),
    sleepQuality: Number(data.sleepQuality || 5),
    note: data.note || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
  });
}

export async function getCheckinsByPatient(pacienteUid) {
  if (!pacienteUid) {
    return [];
  }

  const checkinsRef = collection(db, CHECKINS_COLLECTION);
  const checkinsQuery = query(
    checkinsRef,
    where("pacienteUid", "==", pacienteUid)
  );
  const snapshot = await getDocs(checkinsQuery);

  return sortCheckins(
    snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  );
}

export async function getCheckinsByTherapist(terapeutaId) {
  if (!terapeutaId) {
    return [];
  }

  const checkinsRef = collection(db, CHECKINS_COLLECTION);
  const checkinsQuery = query(
    checkinsRef,
    where("terapeutaId", "==", terapeutaId)
  );
  const snapshot = await getDocs(checkinsQuery);

  return sortCheckins(
    snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  );
}

function sortCheckins(items = []) {
  return items.sort(
    (a, b) => toTime(b.createdAt || b.updatedAt) - toTime(a.createdAt || a.updatedAt)
  );
}

function toTime(value) {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}
