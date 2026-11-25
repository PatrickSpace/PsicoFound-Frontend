export function peruDateKey(now = Date.now()) {
  return new Date(now - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function shiftDate(date, days) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
export function appointmentStart(appointment) {
  return Date.parse(`${appointment?.fecha}T${appointment?.hora || "00:00"}:00-05:00`);
}
export function appointmentEnd(appointment) {
  return appointmentStart(appointment) + Number(appointment?.durationMinutes || 60) * 60000;
}
export function canPatientReschedule(appointment, now = Date.now()) {
  return ["pendiente", "confirmada"].includes(appointment?.estado) &&
    appointmentStart(appointment) - now > 24 * 60 * 60 * 1000;
}
export function canCancelAppointment(appointment, now = Date.now()) {
  return ["pendiente", "confirmada"].includes(appointment?.estado) && appointmentStart(appointment) > now;
}
export function canCompleteAppointment(appointment, now = Date.now()) {
  return appointment?.estado === "confirmada" && appointmentEnd(appointment) <= now;
}
