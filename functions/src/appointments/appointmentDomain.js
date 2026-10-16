const {zonedDateTimeToDate, resolveSchedule} = require("./schedulePolicy.mjs");

const OPEN_APPOINTMENT_STATUSES = new Set(["pendiente", "confirmada"]);
const FINAL_APPOINTMENT_STATUSES = new Set(["realizada", "cancelada"]);

const ROLE_TRANSITIONS = Object.freeze({
  patient: Object.freeze({
    pendiente: new Set(["cancelada"]),
    confirmada: new Set(["cancelada"]),
    realizada: new Set(),
    cancelada: new Set(),
  }),
  psychologist: Object.freeze({
    pendiente: new Set(["confirmada", "cancelada"]),
    confirmada: new Set(["pendiente", "realizada", "cancelada"]),
    realizada: new Set(["confirmada"]),
    cancelada: new Set(),
  }),
  admin: Object.freeze({
    pendiente: new Set(["confirmada", "cancelada"]),
    confirmada: new Set(["pendiente", "realizada", "cancelada"]),
    realizada: new Set(["confirmada"]),
    cancelada: new Set(["pendiente"]),
  }),
});

function normalizeStatus(value, fallback = "pendiente") {
  const normalized = typeof value === "string" ?
    value.trim().toLowerCase() : "";
  return ["pendiente", "confirmada", "realizada", "cancelada"]
      .includes(normalized) ?
    normalized : fallback;
}

function assertTransition(role, currentValue, nextValue) {
  const current = normalizeStatus(currentValue);
  const next = normalizeStatus(nextValue, "");
  const allowed = ROLE_TRANSITIONS[role] && ROLE_TRANSITIONS[role][current];
  if (!next || !allowed || !allowed.has(next)) {
    const error = new Error(
        `La transición ${current} → ${next || "desconocida"} ` +
        `no está permitida para ${role}.`,
    );
    error.code = "permission-denied";
    throw error;
  }
  return {current, next};
}

function isOpenAppointment(value) {
  return OPEN_APPOINTMENT_STATUSES.has(normalizeStatus(value));
}

function isFinalAppointment(value) {
  return FINAL_APPOINTMENT_STATUSES.has(normalizeStatus(value));
}

function assertFutureSlot(slot, now = new Date()) {
  const {start, timeZone} = resolveSchedule(slot);
  if (!start || start.getTime() <= now.getTime()) {
    const error = new Error(
        "El horario debe ser futuro y no tener datos inválidos, " +
        "ambiguos o contradictorios.",
    );
    error.code = "failed-precondition";
    throw error;
  }
  return {start, timeZone};
}

function replaceAppointmentSummary(items, appointmentId, replacement) {
  const current = Array.isArray(items) ? items : [];
  let found = false;
  const result = current.map((item) => {
    if (item && item.citaId === appointmentId) {
      found = true;
      return {...item, ...replacement, citaId: appointmentId};
    }
    return item;
  });
  if (!found) result.push({...replacement, citaId: appointmentId});
  return result;
}

module.exports = {
  ROLE_TRANSITIONS,
  assertFutureSlot,
  assertTransition,
  isFinalAppointment,
  isOpenAppointment,
  normalizeStatus,
  replaceAppointmentSummary,
  zonedDateTimeToDate,
};
