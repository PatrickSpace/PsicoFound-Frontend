// Shared by the browser and Node 22 Functions. Never use the device zone.
export const DEFAULT_TIME_ZONE = "America/Lima";
export const AGENDA_NOTICE = "Todos los horarios se muestran en hora de Lima, Perú (UTC−5)";
export const UNRESOLVED_SCHEDULE = "Horario por revisar: datos inválidos, ambiguos o contradictorios";

export function wallParts(instant, timeZone = DEFAULT_TIME_ZONE) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(instant).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return {date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`};
}

export function zonedDateTimeToDate(date, time, timeZone = DEFAULT_TIME_ZONE) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^\d{2}:\d{2}$/.test(time || "")) return null;
  try {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    const guess = Date.UTC(year, month - 1, day, hour, minute);
    const candidates = new Set();
    for (const hours of [-36, 0, 36]) {
      const probe = guess + hours * 3600000;
      const local = wallParts(new Date(probe), timeZone);
      const offset = Date.parse(`${local.date}T${local.time}:00Z`) - probe;
      const candidate = new Date(guess - offset);
      const check = wallParts(candidate, timeZone);
      if (check.date === date && check.time === time) candidates.add(candidate.getTime());
    }
    return candidates.size === 1 ? new Date([...candidates][0]) : null;
  } catch {
    return null;
  }
}

function explicitInstant(value) {
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
  if (typeof value === "string") {
    const iso = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!iso || Number(iso[2]) > 23 || Number(iso[3]) > 59 || Number(iso[4] || 0) > 59) return null;
    const day = new Date(`${iso[1]}T00:00:00Z`);
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== iso[1]) return null;
    return new Date(value);
  }
  return null;
}

export function resolveSchedule(record = {}) {
  const unresolved = {status: "unresolved", start: null, label: UNRESOLVED_SCHEDULE};
  try {
    if (record.timeZone && record.timezone && record.timeZone !== record.timezone) return unresolved;
    const date = record.fecha ?? record.date;
    const time = record.hora ?? record.startTime;
    const zone = record.timeZone || record.timezone || DEFAULT_TIME_ZONE;
    const explicit = [record.startAt, record.startAtIso].filter((v) => v != null && v !== "");
    const instants = explicit.map(explicitInstant);
    if (instants.some((d) => !d || !Number.isFinite(d.getTime()))) return unresolved;
    if (instants.some((d) => d.getTime() !== instants[0].getTime())) return unresolved;
    const start = instants[0] || zonedDateTimeToDate(date, time, zone);
    if (!start) return unresolved;
    // Explicit UTC disambiguates DST, but must agree with original wall fields.
    const original = wallParts(start, zone);
    if ((date != null && date !== original.date) || (time != null && time !== original.time)) return unresolved;
    const lima = wallParts(start);
    return {status: "resolved", start, date: lima.date, time: lima.time,
      timeZone: DEFAULT_TIME_ZONE, label: `${lima.date} · ${lima.time} · hora de Lima`};
  } catch {
    return unresolved;
  }
}

export function appointmentStart(record = {}) {
  return resolveSchedule(record).start;
}
export function formatAgendaInstant(value) {
  return resolveSchedule({startAt: value}).label;
}
export function isFutureAppointment(record, now = new Date()) {
  const start = appointmentStart(record);
  return Boolean(start && start > now);
}
export function agendaDate(now = new Date()) {
  return wallParts(now).date;
}
export function agendaRange(range, now = new Date()) {
  const today = agendaDate(now);
  const cursor = new Date(`${today}T00:00:00Z`);
  const first = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + (range === "next" ? 1 : 0), 1));
  const end = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
  let start = today;
  if (range === "week") {
    cursor.setUTCDate(cursor.getUTCDate() + 7 - ((cursor.getUTCDay() + 6) % 7));
    return {start, end: cursor.toISOString().slice(0, 10)};
  }
  if (range === "next") start = first.toISOString().slice(0, 10);
  return {start, end: end.toISOString().slice(0, 10)};
}
export function inAgendaRange(record, range, now = new Date()) {
  const schedule = resolveSchedule(record);
  const bounds = agendaRange(range, now);
  return schedule.status === "resolved" && schedule.start > now &&
    schedule.date >= bounds.start && schedule.date < bounds.end;
}
export function agendaPresentation(record = {}) {
  const schedule = resolveSchedule(record);
  return {...record, fecha: schedule.date || "Horario por revisar", hora: schedule.time || "",
    ...(record.timezone ? {timezone: DEFAULT_TIME_ZONE} : {}),
    timeZone: DEFAULT_TIME_ZONE, startAtIso: schedule.start?.toISOString() || "",
    scheduleStatus: schedule.status, scheduleLabel: schedule.label};
}
