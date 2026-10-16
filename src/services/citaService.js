import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";
import { useAppContextStore } from "@/store/appContext";

const functions = getFunctions(
  app,
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1"
);

function currentMode() {
  const mode = useAppContextStore().activeMode;
  return ["patient", "psychologist", "admin"].includes(mode)
    ? mode
    : "patient";
}

export function createOperationId(prefix = "appointment") {
  const randomPart = globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${randomPart}`.replace(/[^A-Za-z0-9_-]/g, "_");
}

async function callAppointmentFunction(name, data = {}) {
  const callable = httpsCallable(functions, name);
  const response = await callable({
    ...data,
    mode: data.mode || currentMode(),
    requestId: data.requestId || createOperationId(name),
  });
  return response.data;
}

export async function createAppointment(data = {}) {
  const result = await callAppointmentFunction("reserveAppointment", data);
  return {
    id: result.appointmentId,
    terapiaId: result.therapyId,
    ...result.appointment,
  };
}

export async function updateAppointment(data = {}) {
  const functionName = data.reschedule
    ? "rescheduleAppointment"
    : "updateAppointmentDetails";
  const result = await callAppointmentFunction(functionName, {
    ...data,
    appointmentId: data.citaId,
  });
  return {
    id: result.appointmentId,
    citaId: result.appointmentId,
    terapiaId: result.therapyId,
    ...result.appointment,
  };
}

export async function confirmAppointment({ citaId, requestId } = {}) {
  return callAppointmentFunction("changeAppointmentStatus", {
    appointmentId: citaId,
    status: "confirmada",
    mode: "psychologist",
    requestId,
  });
}

export async function markAppointmentAsCompleted({
  citaId,
  sessionSummary = "",
  attendedAt,
  reason,
  expectedVersion,
  requestId,
} = {}) {
  return callAppointmentFunction("changeAppointmentStatus", {
    appointmentId: citaId,
    status: "realizada",
    sessionSummary,
    attendedAt,
    reason,
    expectedVersion,
    mode: "psychologist",
    requestId,
  });
}

export async function rejectAppointment({ citaId, reason, expectedVersion, requestId } = {}) {
  return callAppointmentFunction("changeAppointmentStatus", {
    appointmentId: citaId,
    status: "cancelada",
    reason,
    expectedVersion,
    mode: "psychologist",
    requestId,
  });
}

export async function cancelAppointment({
  citaId,
  reason = "",
  requestId,
} = {}) {
  return callAppointmentFunction("changeAppointmentStatus", {
    appointmentId: citaId,
    status: "cancelada",
    reason,
    mode: "patient",
    requestId,
  });
}

export async function correctAppointmentAttendance({ citaId, attendedAt, sessionSummary, reason, expectedVersion, requestId } = {}) {
  return callAppointmentFunction("changeAppointmentStatus", {
    appointmentId: citaId, status: "realizada", sessionAction: "correct", attendedAt,
    sessionSummary, reason, expectedVersion, requestId, mode: "psychologist",
  });
}
export async function undoAppointmentCompletion({ citaId, reason, confirmNotAttended, expectedVersion, requestId } = {}) {
  return callAppointmentFunction("changeAppointmentStatus", {
    appointmentId: citaId, status: "confirmada", sessionAction: "undo", reason, confirmNotAttended,
    expectedVersion, requestId, mode: "psychologist",
  });
}
