const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertFutureSlot,
  assertTransition,
  isOpenAppointment,
  replaceAppointmentSummary,
  zonedDateTimeToDate,
} = require("./appointmentDomain");

test("patient can cancel but cannot confirm or complete an appointment", () => {
  assert.deepEqual(assertTransition("patient", "pendiente", "cancelada"), {
    current: "pendiente",
    next: "cancelada",
  });
  assert.throws(() => assertTransition("patient", "pendiente", "confirmada"));
  assert.throws(() => assertTransition("patient", "confirmada", "realizada"));
});

test("psychologist transitions are explicit and do not reopen cancellations",
    () => {
      assert.doesNotThrow(() =>
        assertTransition("psychologist", "pendiente", "confirmada"));
      assert.doesNotThrow(() =>
        assertTransition("psychologist", "confirmada", "realizada"));
      assert.throws(() =>
        assertTransition("psychologist", "cancelada", "pendiente"));
    });

test("open appointment status only includes pending and confirmed", () => {
  assert.equal(isOpenAppointment("pendiente"), true);
  assert.equal(isOpenAppointment("confirmada"), true);
  assert.equal(isOpenAppointment("realizada"), false);
  assert.equal(isOpenAppointment("cancelada"), false);
});

test("converts local appointment time using the declared timezone", () => {
  assert.equal(
      zonedDateTimeToDate("2026-10-04", "12:30", "America/Lima").toISOString(),
      "2026-10-04T17:30:00.000Z",
  );
  assert.equal(
      zonedDateTimeToDate("2026-10-04", "12:30", "Europe/Madrid").toISOString(),
      "2026-10-04T10:30:00.000Z",
  );
});

test("rejects past slots with a server-owned clock", () => {
  assert.throws(() => assertFutureSlot(
      {date: "2026-10-04", startTime: "12:30", timeZone: "America/Lima"},
      new Date("2026-10-04T17:31:00.000Z"),
  ));
  assert.doesNotThrow(() => assertFutureSlot(
      {date: "2026-10-04", startTime: "12:30", timeZone: "America/Lima"},
      new Date("2026-10-04T17:29:00.000Z"),
  ));
});

test("appointment summary replacement is deterministic", () => {
  const result = replaceAppointmentSummary(
      [{citaId: "a", estado: "pendiente"}],
      "a",
      {estado: "confirmada"},
  );
  assert.deepEqual(result, [{citaId: "a", estado: "confirmada"}]);
});
