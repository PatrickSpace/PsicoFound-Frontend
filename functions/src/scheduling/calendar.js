const {HttpsError} = require("firebase-functions/v2/https");

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const TIMEZONE = "America/Lima";
const DEFAULT_SETTINGS = Object.freeze({
  durationMinutes: 45,
  bufferMinutes: 15,
  minimumNoticeHours: 2,
  timezone: TIMEZONE,
  windows: [],
});

function invalid(message) {
  throw new HttpsError("invalid-argument", message);
}

function dateKey(ms = Date.now()) {
  return new Date(ms - 5 * 60 * MINUTE).toISOString().slice(0, 10);
}

function minutes(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) {
    invalid("Ingresa una hora válida.");
  }
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function timeKey(value) {
  return (
    `${String(Math.floor(value / 60)).padStart(2, "0")}:` +
    String(value % 60).padStart(2, "0")
  );
}

function timestamp(date, time = "00:00") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    invalid("Ingresa una fecha válida.");
  }
  minutes(time);
  const ms = Date.parse(`${date}T${time}:00-05:00`);
  if (!Number.isFinite(ms) || dateKey(ms) !== date) {
    invalid("Ingresa una fecha válida.");
  }
  return ms;
}

function boundedInteger(value, min, max, label, step = 1) {
  const number = Number(value);
  if (
    !Number.isInteger(number) ||
    number < min ||
    number > max ||
    number % step !== 0
  ) {
    invalid(`${label}: usa un valor entre ${min} y ${max}.`);
  }
  return number;
}

function settings(input = {}) {
  const result = {
    durationMinutes: boundedInteger(
        input.durationMinutes ?? 45,
        15,
        180,
        "Duración",
        5,
    ),
    bufferMinutes: boundedInteger(
        input.bufferMinutes ?? 15,
        0,
        120,
        "Descanso",
        5,
    ),
    minimumNoticeHours: boundedInteger(
        input.minimumNoticeHours ?? 2,
        0,
        168,
        "Anticipación",
    ),
    timezone: TIMEZONE,
  };
  if (!Array.isArray(input.windows) || input.windows.length > 28) {
    invalid("Configura hasta 28 franjas semanales.");
  }
  result.windows = input.windows.map((window) => {
    const day = boundedInteger(window.day, 0, 6, "Día de la semana");
    const start = minutes(window.startTime);
    const end = minutes(window.endTime);
    if (end - start < result.durationMinutes) {
      invalid("Cada franja debe permitir al menos una sesión completa.");
    }
    const modality = window.modality || "Remoto";
    if (!["Remoto", "Presencial"].includes(modality)) {
      invalid("Elige una modalidad concreta para cada franja.");
    }
    const location =
      modality === "Remoto" ?
        "Terapia Online" :
        String(window.location || "")
            .trim()
            .slice(0, 240);
    if (!location) {
      invalid("Indica la dirección de las sesiones presenciales.");
    }
    return {
      day,
      startTime: window.startTime,
      endTime: window.endTime,
      modality,
      location,
    };
  });
  result.windows.forEach((a, i) => {
    if (
      result.windows
          .slice(i + 1)
          .some(
              (b) =>
                a.day === b.day &&
            minutes(a.startTime) < minutes(b.endTime) &&
            minutes(b.startTime) < minutes(a.endTime),
          )
    ) {
      invalid("Las franjas del mismo día no pueden cruzarse.");
    }
  });
  return result;
}

function interval(slot) {
  const start = timestamp(slot.date, slot.startTime);
  const duration = Number(
      slot.durationMinutes ||
      (slot.endTime ?
        minutes(slot.endTime) - minutes(slot.startTime) :
        60),
  );
  if (!Number.isFinite(duration) || duration < 15 || duration > 180) {
    invalid("El horario tiene una duración inválida.");
  }
  const end = start + duration * MINUTE;
  return {
    start,
    end,
    busyEnd: end + Number(slot.bufferMinutes || 0) * MINUTE,
    durationMinutes: duration,
  };
}

function overlaps(a, b) {
  return a.start < b.busyEnd && b.start < a.busyEnd;
}

function assertBookable(slot, now = Date.now(), minimumNoticeHours = 0) {
  const span = interval(slot);
  if (
    slot.status !== "available" ||
    span.start <= now ||
    span.start < now + Number(minimumNoticeHours) * 60 * MINUTE
  ) {
    throw new HttpsError(
        "failed-precondition",
        "El horario ya no está disponible o no cumple la anticipación mínima.",
    );
  }
  return span;
}

function generateSlots(input, now = Date.now()) {
  const config = settings(input.settings || {});
  const start = timestamp(input.fromDate);
  const end = timestamp(input.toDate);
  if (
    input.fromDate < dateKey(now) ||
    end < start ||
    end - start >= 84 * DAY ||
    end > now + 366 * DAY
  ) {
    invalid(
        "Proyecta entre 1 y 84 días, dentro de los próximos 12 meses.",
    );
  }
  if (
    !Array.isArray(input.excludedDates || []) ||
    (input.excludedDates || []).length > 84
  ) {
    invalid("Revisa los días excluidos.");
  }
  const excluded = new Set(
      (input.excludedDates || []).map((date) => {
        timestamp(date);
        return date;
      }),
  );
  const slots = [];
  for (let day = start; day <= end; day += DAY) {
    const date = dateKey(day);
    if (excluded.has(date)) continue;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    for (const window of config.windows.filter((w) => w.day === weekday)) {
      for (
        let m = minutes(window.startTime);
        m + config.durationMinutes <= minutes(window.endTime);
        m += config.durationMinutes + config.bufferMinutes
      ) {
        const slot = {
          date,
          startTime: timeKey(m),
          endTime: timeKey(m + config.durationMinutes),
          durationMinutes: config.durationMinutes,
          bufferMinutes: config.bufferMinutes,
          minimumNoticeHours: config.minimumNoticeHours,
          timezone: TIMEZONE,
          modality: window.modality,
          location: window.location,
          status: "available",
        };
        if (
          timestamp(date, slot.startTime) <=
          now + config.minimumNoticeHours * 60 * MINUTE
        ) {
          continue;
        }
        // Include buffers across adjacent windows as well as within each one.
        if (
          slots.some((other) => overlaps(interval(slot), interval(other)))
        ) {
          invalid(
              "Deja espacio para el descanso entre las franjas del mismo día.",
          );
        }
        slots.push(slot);
        if (slots.length > 350) {
          invalid(
              "Genera como máximo 350 bloques por vez. Reduce el periodo.",
          );
        }
      }
    }
  }
  return {settings: config, slots};
}

function appointmentInterval(appointment) {
  return interval({
    date: appointment.fecha,
    startTime: appointment.hora,
    endTime: appointment.endTime,
    durationMinutes: appointment.durationMinutes || 60,
    bufferMinutes: appointment.bufferMinutes || 0,
  });
}

function assertTransition(appointment, next, now = Date.now()) {
  const current = appointment.estado;
  const span = appointmentInterval(appointment);
  if (current === next) return;
  const allowed = {
    pendiente: ["confirmada", "cancelada"],
    confirmada: ["realizada", "no_asistio", "cancelada"],
  };
  if (!allowed[current]?.includes(next)) {
    throw new HttpsError(
        "failed-precondition",
        "El estado de la cita cambió. Actualiza tu agenda.",
    );
  }
  if (["realizada", "no_asistio"].includes(next) && span.end > now) {
    throw new HttpsError(
        "failed-precondition",
        "Puedes cerrar la sesión después de su hora de finalización.",
    );
  }
  if (["confirmada", "cancelada"].includes(next) && span.start <= now) {
    throw new HttpsError(
        "failed-precondition",
        "La sesión ya comenzó. Registra su resultado en la agenda.",
    );
  }
}

module.exports = {
  MINUTE,
  DAY,
  TIMEZONE,
  DEFAULT_SETTINGS,
  dateKey,
  timestamp,
  minutes,
  timeKey,
  settings,
  interval,
  overlaps,
  assertBookable,
  generateSlots,
  appointmentInterval,
  assertTransition,
};
