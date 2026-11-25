import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";

const functions = getFunctions(app, "southamerica-east1");
const call = async (name, data) => (await httpsCallable(functions, name)(data)).data;

export const getCalendarSettings = (therapistId) =>
  call("getTherapistCalendar", { therapistId });
export const projectAvailability = (payload) => call("projectAvailability", payload);
export const closeAvailability = (payload) => call("closeAvailability", payload);

export async function getAvailabilityByTherapist(therapistId, options = {}) {
  if (!therapistId) return [];
  const result = await call("listAvailability", {
    therapistId, includeReserved: true, ...options,
  });
  return result.slots || [];
}

export async function getAvailableSlotsByTherapist(therapistId, options = {}) {
  if (!therapistId) return [];
  const result = await call("listAvailability", { therapistId, ...options });
  return result.slots || [];
}

export const calendarPlannerEnabled = import.meta.env.VITE_CALENDAR_ENABLED === "true";
