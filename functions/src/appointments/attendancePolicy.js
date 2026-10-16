/* eslint-disable max-len */
const {HttpsError} = require("firebase-functions/v2/https");
const {resolveSchedule} = require("./schedulePolicy.mjs");

function iso(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
function attendanceSnapshot(appointment) {
  return {status: appointment.estado, attendedAt: iso(appointment.attendedAt),
    sessionSummary: appointment.sessionSummary || "", completedAt: iso(appointment.completedAt),
    completedBy: appointment.completedBy || ""};
}
function attendanceChange(current, data, actor, now = new Date()) {
  const action = data.sessionAction || "complete";
  if (actor.mode !== "psychologist") throw new HttpsError("permission-denied", "Solo el profesional responsable puede registrar o corregir la atención.");
  if (data.expectedVersion !== Number(current.version || 1)) throw new HttpsError("aborted", "La cita cambió. Actualiza la agenda y revisa antes de guardar.");
  if (!["complete", "correct", "undo"].includes(action)) throw new HttpsError("invalid-argument", "Acción de atención inválida.");
  if (current.estado !== (action === "complete" ? "confirmada" : "realizada")) throw new HttpsError("failed-precondition", "El estado actual de la cita no permite esta acción.");
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";
  if (reason.length > 500 || (action !== "complete" && !reason)) throw new HttpsError("invalid-argument", "Indica el motivo de la corrección (hasta 500 caracteres).");
  const before = attendanceSnapshot(current);
  if (action === "undo") {
    if (data.confirmNotAttended !== true) throw new HttpsError("invalid-argument", "Confirma que la atención no ocurrió y se registró por error.");
    return {action, reason, before, update: {estado: "confirmada", attendedAt: null,
      sessionSummary: "", completedAt: null, completedBy: ""}};
  }
  const scheduled = resolveSchedule(current).start;
  if (action === "complete" && (!scheduled || scheduled > now)) throw new HttpsError("failed-precondition", "La sesión solo puede registrarse cuando haya llegado su hora programada.");
  const actual = resolveSchedule({startAtIso: data.attendedAt}).start;
  if (!actual || actual > now) throw new HttpsError("invalid-argument", "Indica una fecha y hora de atención válidas, sin fechas futuras.");
  if (action === "complete" && Math.abs(actual - scheduled) >= 60000 && !reason) throw new HttpsError("invalid-argument", "Explica por qué la atención ocurrió en otro horario.");
  if (typeof data.sessionSummary !== "string" || data.sessionSummary.length > 2000) throw new HttpsError("invalid-argument", "El resumen compartido admite hasta 2000 caracteres.");
  const update = {estado: "realizada", attendedAt: actual.toISOString(), sessionSummary: data.sessionSummary.trim()};
  if (action === "complete") Object.assign(update, {completedAt: now.toISOString(), completedBy: actor.uid});
  if (action === "correct" && before.attendedAt === update.attendedAt && before.sessionSummary === update.sessionSummary) throw new HttpsError("failed-precondition", "No hay cambios en la atención para guardar.");
  return {action, reason, before, update};
}
module.exports = {attendanceChange, attendanceSnapshot};
