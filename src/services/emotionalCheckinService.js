import {
  addDoc,
  collection,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";
import { appendLongitudinalEvent } from "@/services/longitudinalHistoryService";
import { readQuery, trackWrite } from "@/repositories/firestoreRepository";
import { CACHE_TTL, getOrFetch, invalidateCachePrefix } from "@/utils/requestCache";

const CHECKINS_COLLECTION = "emotional_checkins";

export async function createEmotionalCheckin(data = {}) {
  if (!data.pacienteUid || !data.mood) {
    throw new Error("Faltan datos para registrar el estado emocional.");
  }

  const payload = {
    pacienteUid: data.pacienteUid,
    pacienteNombre: data.pacienteNombre || "",
    terapeutaId: data.terapeutaId || "",
    terapeutaNombre: data.terapeutaNombre || "",
    terapiaId: data.terapiaId || "",
    mood: data.mood,
    intensity: Number(data.intensity || 5),
    energy: Number(data.energy || 5),
    sleepQuality: Number(data.sleepQuality || 5),
    note: data.note || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdBy: auth.currentUser?.uid || data.pacienteUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await trackWrite({
    resource: CHECKINS_COLLECTION,
    source: "createEmotionalCheckin",
    operation: "addDoc",
    write: () => addDoc(collection(db, CHECKINS_COLLECTION), payload),
  });
  const checkin = { id: docRef.id, ...payload };
  invalidateCachePrefix("checkins:");

  await safelyAppendCheckinEvent(checkin);

  return checkin;
}

export async function getCheckinsByPatient(pacienteUid, options = {}) {
  if (!pacienteUid) {
    return [];
  }

  return getOrFetch({
    key: `checkins:patient:${pacienteUid}`,
    ttl: CACHE_TTL.CLINICAL_LIST,
    force: options.force,
    resource: CHECKINS_COLLECTION,
    source: "getCheckinsByPatient",
    fetcher: async () => {
      const snapshot = await readQuery(
        query(collection(db, CHECKINS_COLLECTION), where("pacienteUid", "==", pacienteUid)),
        { resource: CHECKINS_COLLECTION, source: "getCheckinsByPatient" }
      );
      return sortCheckins(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
  });
}

export async function getCheckinsByTherapist(terapeutaId, options = {}) {
  if (!terapeutaId) {
    return [];
  }

  return getOrFetch({
    key: `checkins:therapist:${terapeutaId}`,
    ttl: CACHE_TTL.CLINICAL_LIST,
    force: options.force,
    resource: CHECKINS_COLLECTION,
    source: "getCheckinsByTherapist",
    fetcher: async () => {
      const snapshot = await readQuery(
        query(collection(db, CHECKINS_COLLECTION), where("terapeutaId", "==", terapeutaId)),
        { resource: CHECKINS_COLLECTION, source: "getCheckinsByTherapist" }
      );
      return sortCheckins(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
  });
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

async function safelyAppendCheckinEvent(checkin) {
  try {
    await appendLongitudinalEvent({
      pacienteUid: checkin.pacienteUid,
      eventType: "emotional_checkin_created",
      sourceType: "emotional_checkin",
      sourceId: checkin.id || "",
      terapiaId: checkin.terapiaId || "",
      title: "Registro emocional agregado",
      summary: `Estado registrado: ${checkin.mood}, intensidad ${checkin.intensity}/10.`,
      createdBy: auth.currentUser?.uid || checkin.pacienteUid,
      metadata: {
        checkinId: checkin.id || "",
        terapeutaId: checkin.terapeutaId || "",
        mood: checkin.mood || "",
        intensity: Number(checkin.intensity || 0),
        energy: Number(checkin.energy || 0),
        sleepQuality: Number(checkin.sleepQuality || 0),
        tags: checkin.tags || [],
      },
    });
  } catch (error) {
    console.warn("Could not append longitudinal check-in event:", error);
  }
}
