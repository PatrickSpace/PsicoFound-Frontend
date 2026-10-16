/* eslint-disable max-len */
const test = require("node:test");
const assert = require("node:assert/strict");
const {attendanceChange} = require("./attendancePolicy");
const now = new Date("2026-10-15T18:00:00Z");
const actor = {mode: "psychologist", uid: "professional-a"};
const appointment = {estado: "confirmada", version: 2,
  startAtIso: "2026-10-15T15:00:00Z"};
const input = {expectedVersion: 2, attendedAt: "2026-10-15T15:00:00Z",
  sessionSummary: "Resumen"};

test("attendance separates actual and recorded times and rejects future sessions", () => {
  const change = attendanceChange(appointment, input, actor, now);
  assert.equal(change.update.attendedAt, "2026-10-15T15:00:00.000Z");
  assert.equal(change.update.completedAt, now.toISOString());
  assert.equal(change.update.completedBy, actor.uid);
  assert.throws(() => attendanceChange({...appointment,
    startAtIso: "2026-10-16T15:00:00Z"}, input, actor, now),
  {code: "failed-precondition"});
  assert.throws(() => attendanceChange(appointment, {...input,
    attendedAt: "2026-10-16T15:00:00Z"}, actor, now),
  {code: "invalid-argument"});
});

test("different actual time requires reason and invalid zone-less dates fail", () => {
  assert.throws(() => attendanceChange(appointment, {...input,
    attendedAt: "2026-10-15T15:30:00Z"}, actor, now),
  {code: "invalid-argument"});
  assert.throws(() => attendanceChange(appointment, {...input,
    attendedAt: "2026-10-15T15:00:00"}, actor, now),
  {code: "invalid-argument"});
});

test("correction preserves original recording, requires reason and version", () => {
  const current = {...appointment, estado: "realizada",
    attendedAt: input.attendedAt, completedAt: "2026-10-15T17:00:00Z",
    sessionSummary: "Anterior", completedBy: actor.uid};
  const data = {...input, sessionAction: "correct", reason: "Dato corregido"};
  const change = attendanceChange(current, data, actor, now);
  assert.equal(change.before.sessionSummary, "Anterior");
  assert.equal(change.update.completedAt, undefined);
  assert.throws(() => attendanceChange(current, {...data,
    reason: ""}, actor, now), {code: "invalid-argument"});
  assert.throws(() => attendanceChange(current, {...data,
    expectedVersion: 1}, actor, now), {code: "aborted"});
  assert.throws(() => attendanceChange(current, data,
      {mode: "patient"}, now), {code: "permission-denied"});
});

test("undo needs explicit non-attendance confirmation and retains prior snapshot", () => {
  const current = {...appointment, estado: "realizada",
    sessionSummary: "Anterior", attendedAt: input.attendedAt};
  const data = {...input, sessionAction: "undo", reason: "No ocurrió"};
  assert.throws(() => attendanceChange(current, data, actor, now),
      {code: "invalid-argument"});
  const change = attendanceChange(current, {...data,
    confirmNotAttended: true}, actor, now);
  assert.equal(change.update.estado, "confirmada");
  assert.equal(change.update.attendedAt, null);
  assert.equal(change.before.sessionSummary, "Anterior");
});
