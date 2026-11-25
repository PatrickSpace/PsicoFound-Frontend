import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";
import { invalidateCachePrefix } from "@/utils/requestCache";

const functions = getFunctions(app, "southamerica-east1");
const mutate = httpsCallable(functions, "mutateAppointment");
const cancel = httpsCallable(functions, "cancelAppointment");

export function invalidateAppointmentCaches() {
  invalidateCachePrefix("therap");
  invalidateCachePrefix("availability:");
}

async function execute(payload) {
  const result = await mutate(payload);
  invalidateAppointmentCaches();
  return result.data;
}

export function markAppointmentAsNoShow(data) {
  return execute({ ...data, action: "status", estado: "no_asistio" });
}

export function updateAppointment(data) {
  return execute({ ...data, action: "details" });
}

export function rescheduleAppointment(data) {
  return execute({ ...data, action: "reschedule" });
}

export async function cancelAppointment(data) {
  const result = await cancel(data);
  invalidateAppointmentCaches();
  return result.data;
}
