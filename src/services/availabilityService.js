import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";

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

  const docRef = await addDoc(collection(db, AVAILABILITY_COLLECTION), payload);

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function getAvailabilityByTherapist(therapistId) {
  if (!therapistId) {
    return [];
  }

  const availabilityQuery = query(
    collection(db, AVAILABILITY_COLLECTION),
    where("therapistId", "==", therapistId)
  );
  const snapshot = await getDocs(availabilityQuery);

  return snapshot.docs
    .map((item) => normalizeSlot(item.id, item.data()))
    .sort(compareSlots);
}

export async function getAvailableSlotsByTherapist(therapistId) {
  const slots = await getAvailabilityByTherapist(therapistId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return slots.filter((slot) => {
    const status = (slot.status || "").toString().trim().toLowerCase();
    const slotDate = parseDateOnly(slot.date);

    return status === "available" && slotDate && slotDate >= today;
  });
}

export async function closeAvailabilitySlot(slotId) {
  if (!slotId) {
    throw new Error("Falta el bloque de disponibilidad.");
  }

  await updateDoc(doc(db, AVAILABILITY_COLLECTION, slotId), {
    status: "closed",
    updatedAt: serverTimestamp(),
  });
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

function parseDateOnly(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
