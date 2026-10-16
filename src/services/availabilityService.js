import { collection, getDocs, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";
import { useAppContextStore } from "@/store/appContext";
import { createOperationId } from "@/services/citaService";
import { DEFAULT_TIME_ZONE, resolveSchedule, wallParts } from "@/utils/dateTime";

const functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1");
async function manage(data) {
  if (data.timeZone && data.timeZone !== DEFAULT_TIME_ZONE) {
    throw new Error("La agenda opera exclusivamente en hora de Lima (America/Lima).");
  }
  return (await httpsCallable(functions, "manageAvailability")({
    ...data, mode: useAppContextStore().activeMode,
    timeZone: DEFAULT_TIME_ZONE,
    requestId: data.requestId || createOperationId("availability"),
  })).data;
}
export async function createAvailabilitySlot(data) {
  return manage({...data, action: "create"});
}
export async function closeAvailabilitySlot(slotId, therapistId) {
  return manage({action: "close", slotId, therapistId});
}
export async function getAvailabilityByTherapist(therapistId) {
  if (!therapistId) return [];
  const snapshot = await getDocs(query(collection(db, "therapist_availability"), where("therapistId", "==", therapistId)));
  return snapshot.docs.map((item) => {
    const original = item.data();
    const schedule = resolveSchedule(original);
    const end = schedule.start ? wallParts(new Date(schedule.start.getTime() + Number(original.durationMinutes || 60) * 60000)) : null;
    return {...original, id: item.id, originalSchedule: original,
      ...(original.timezone ? {timezone: DEFAULT_TIME_ZONE} : {}),
      date: schedule.date || "", startTime: schedule.time || "", endTime: end?.time || "",
      endDate: end?.date || "", timeZone: DEFAULT_TIME_ZONE,
      startAtIso: schedule.start?.toISOString() || "", scheduleStatus: schedule.status,
      scheduleLabel: schedule.label};
  }).sort((a, b) => a.startAtIso.localeCompare(b.startAtIso));
}
export async function getAvailableSlotsByTherapist(therapistId) {
  const now = new Date();
  return (await getAvailabilityByTherapist(therapistId)).filter((slot) =>
    slot.status === "available" && slot.scheduleStatus === "resolved" && new Date(slot.startAtIso) > now);
}
