const test = require("node:test");
const assert = require("node:assert/strict");
const c = require("./calendar");

const now = c.timestamp("2030-01-01", "08:00");
const input = () => ({
  fromDate: "2030-01-07",
  toDate: "2030-01-21",
  settings: {
    durationMinutes: 45,
    bufferMinutes: 15,
    minimumNoticeHours: 2,
    windows: [
      {day: 1, startTime: "09:00", endTime: "12:00", modality: "Remoto"},
    ],
  },
  excludedDates: ["2030-01-14"],
});

test("45 minute sessions plus a 15 " +
         "minute break repeat and skip days off", () => {
  const result = c.generateSlots(input(), now);
  assert.equal(result.slots.length, 6);
  assert.deepEqual(
      result.slots.slice(0, 3).map((s) => [s.startTime, s.endTime]),
      [
        ["09:00", "09:45"],
        ["10:00", "10:45"],
        ["11:00", "11:45"],
      ],
  );
  assert.equal(result.slots[3].date, "2030-01-21");
});

test("partial sessions, overlapping " +
         "windows and invalid durations are rejected", () => {
  const data = input();
  data.settings.windows[0].endTime = "09:30";
  assert.throws(() => c.generateSlots(data, now), /sesión completa/);
  data.settings.windows[0].endTime = "12:00";
  data.settings.windows.push({
    ...data.settings.windows[0],
    startTime: "10:00",
  });
  assert.throws(() => c.generateSlots(data, now), /cruzarse/);
  data.settings.durationMinutes = -45;
  assert.throws(() => c.generateSlots(data, now), /Duración/);
});

test("buffers prevent collisions across separate windows", () => {
  const data = input();
  data.settings.windows[0].endTime = "09:45";
  data.settings.windows.push({
    day: 1,
    startTime: "09:50",
    endTime: "10:50",
    modality: "Remoto",
  });
  assert.throws(() => c.generateSlots(data, now), /descanso/);
});

test("invalid dates and excessive generation cannot publish", () => {
  assert.throws(() => c.timestamp("2030-02-30", "10:00"), /fecha/);
  assert.throws(() => c.timestamp("2030-01-01", "24:30"), /hora/);
  assert.throws(
      () => c.generateSlots({...input(), toDate: "2031-01-21"}, now),
      /84 días/,
  );
  const data = input();
  data.toDate = "2030-03-20";
  data.settings.durationMinutes = 15;
  data.settings.bufferMinutes = 0;
  data.settings.windows = Array.from({length: 7}, (_, day) => ({
    day,
    startTime: "08:00",
    endTime: "20:00",
    modality: "Remoto",
  }));
  assert.throws(() => c.generateSlots(data, now), /350/);
});

test("a held, past or short-notice slot cannot be booked", () => {
  const slot = {
    date: "2030-01-01",
    startTime: "09:00",
    durationMinutes: 45,
    status: "available",
  };
  assert.throws(() => c.assertBookable(slot, now, 2), /anticipación/);
  assert.throws(
      () => c.assertBookable({...slot, status: "held"}, now),
      /disponible/,
  );
  assert.throws(() => c.assertBookable(slot, now + c.DAY), /disponible/);
  assert.equal(c.assertBookable(slot, now, 1).durationMinutes, 45);
});

test("state transitions prohibit early " +
         "completion and reopening terminal sessions", () => {
  const appointment = {
    fecha: "2030-01-01",
    hora: "09:00",
    durationMinutes: 45,
    estado: "confirmada",
  };
  assert.throws(
      () => c.assertTransition(appointment, "realizada", now),
      /finalización/,
  );
  c.assertTransition(
      appointment,
      "realizada",
      c.timestamp("2030-01-01", "09:45"),
  );
  c.assertTransition(
      appointment,
      "no_asistio",
      c.timestamp("2030-01-01", "10:00"),
  );
  assert.throws(() =>
    c.assertTransition(
        {...appointment, estado: "realizada"},
        "pendiente",
        now,
    ),
  );
  assert.throws(() =>
    c.assertTransition(
        {...appointment, estado: "cancelada"},
        "confirmada",
        now,
    ),
  );
  assert.throws(() =>
    c.assertTransition(
        {...appointment, estado: "pendiente"},
        "no_asistio",
        now,
    ),
  );
});
