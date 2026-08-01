import {
  addDoc,
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";
import { readQuery, trackWrite } from "@/repositories/firestoreRepository";
import {
  CACHE_TTL,
  getOrFetch,
  invalidateCachePrefix,
} from "@/utils/requestCache";

const AVAILABILITY_COLLECTION = "therapist_availability";
export const SLOT_DURATION_MINUTES = 60;

export async function createAvailabilitySlot({
  therapistId,
  date,
  startTime,
  modality = "Remoto",
  location = "",
}) {
  if (!therapistId || !date || !startTime) {
    throw new Error("Falta fecha u hora para abrir disponibilidad.");
  }

  const existingSlots = await getAvailabilityByTherapist(therapistId);
  const duplicatedSlot = existingSlots.some(
    (slot) =>
      slot.date === date &&
      slot.startTime === startTime &&
      (slot.status || "").toString().trim().toLowerCase() !== "closed"
  );

  if (duplicatedSlot) {
    throw new Error("Ya existe un bloque abierto para esa fecha y hora.");
  }

  const payload = {
    therapistId,
    date,
    startTime,
    endTime: addMinutesToTime(startTime, SLOT_DURATION_MINUTES),
    durationMinutes: SLOT_DURATION_MINUTES,
    modality,
    location: normalizeLocation(modality, location),
    status: "available",
    createdBy: auth.currentUser?.uid || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await trackWrite({
    resource: AVAILABILITY_COLLECTION,
    source: "createAvailabilitySlot",
    operation: "addDoc",
    write: () => addDoc(collection(db, AVAILABILITY_COLLECTION), payload),
  });
  invalidateAvailabilityCaches(therapistId);

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function getAvailabilityByTherapist(therapistId, options = {}) {
  if (!therapistId) {
    return [];
  }

  return getOrFetch({
    key: `availability:${therapistId}:future`,
    ttl: CACHE_TTL.AVAILABILITY,
    force: options.force,
    resource: AVAILABILITY_COLLECTION,
    source: "getAvailabilityByTherapist",
    fetcher: async () => {
      const availabilityQuery = query(
        collection(db, AVAILABILITY_COLLECTION),
        where("therapistId", "==", therapistId),
        where("date", ">=", todayDateKey()),
        orderBy("date", "asc"),
        limit(200)
      );
      const snapshot = await readQuery(availabilityQuery, {
        resource: AVAILABILITY_COLLECTION,
        source: "getAvailabilityByTherapist",
      });

      return snapshot.docs
        .map((item) => normalizeSlot(item.id, item.data()))
        .sort(compareSlots);
    },
  });
}

export async function getAvailableSlotsByTherapist(therapistId, options = {}) {
  if (!therapistId) return [];

  return getOrFetch({
    key: `availability:${therapistId}:available`,
    ttl: CACHE_TTL.AVAILABILITY,
    force: options.force,
    resource: AVAILABILITY_COLLECTION,
    source: "getAvailableSlotsByTherapist",
    fetcher: async () => {
      const availabilityQuery = query(
        collection(db, AVAILABILITY_COLLECTION),
        where("therapistId", "==", therapistId),
        where("status", "==", "available"),
        where("date", ">=", todayDateKey()),
        orderBy("date", "asc"),
        limit(100)
      );
      const snapshot = await readQuery(availabilityQuery, {
        resource: AVAILABILITY_COLLECTION,
        source: "getAvailableSlotsByTherapist",
      });
      return snapshot.docs
        .map((item) => normalizeSlot(item.id, item.data()))
        .sort(compareSlots);
    },
  });
}

export async function closeAvailabilitySlot(slotId) {
  if (!slotId) {
    throw new Error("Falta el bloque de disponibilidad.");
  }

  await trackWrite({
    resource: AVAILABILITY_COLLECTION,
    source: "closeAvailabilitySlot",
    operation: "updateDoc",
    write: () => updateDoc(doc(db, AVAILABILITY_COLLECTION, slotId), {
      status: "closed",
      updatedAt: serverTimestamp(),
    }),
  });
  invalidateCachePrefix("availability:");
}

export function addMinutesToTime(time, minutes) {
  const [hours = "0", mins = "0"] = (time || "00:00").split(":");
  const date = new Date(2000, 0, 1, Number(hours), Number(mins));
  date.setMinutes(date.getMinutes() + minutes);

  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function normalizeSlot(id, data = {}) {
  return {
    id,
    therapistId: data.therapistId || "",
    date: data.date || "",
    startTime: data.startTime || "",
    endTime: data.endTime || "",
    durationMinutes: Number(data.durationMinutes || SLOT_DURATION_MINUTES),
    modality: data.modality || "Remoto",
    location: data.location || "",
    status: data.status || "available",
    bookedBy: data.bookedBy || "",
    appointmentId: data.appointmentId || "",
  };
}

export function compareSlots(a, b) {
  return `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`);
}

function normalizeLocation(modality, location) {
  const normalized = (modality || "").toString().trim().toLowerCase();

  if (["remoto", "online", "remota"].includes(normalized)) {
    return "Terapia Online";
  }

  return location || "";
}

function todayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function invalidateAvailabilityCaches(therapistId) {
  if (therapistId) {
    invalidateCachePrefix(`availability:${therapistId}:`);
  }
}
