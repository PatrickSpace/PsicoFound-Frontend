import test from "node:test";
import assert from "node:assert/strict";
import { resolveSchedule, agendaRange, inAgendaRange, agendaPresentation } from "../../src/utils/dateTime.js";

test("legacy instants convert to Lima without relabeling wall numbers", () => {
  for (const extra of [{}, { startAtIso: "2099-07-15T10:00:00Z" }]) {
    const original = { date: "2099-07-15", startTime: "12:00", timeZone: "Europe/Madrid", ...extra };
    const resolved = resolveSchedule(original);
    assert.equal(resolved.start.toISOString(), "2099-07-15T10:00:00.000Z");
    assert.equal(resolved.time, "05:00");
    assert.equal(original.startTime, "12:00");
    assert.equal(resolveSchedule(agendaPresentation({fecha: original.date, hora: original.startTime, timeZone: original.timeZone})).time, "05:00");
  }
  const alias = {fecha: "2099-07-15", hora: "12:00", timezone: "Europe/Madrid"};
  assert.equal(resolveSchedule(agendaPresentation(alias)).time, "05:00");
  assert.equal(alias.timezone, "Europe/Madrid");
});
test("invalid, contradictory and ambiguous records require explicit review", () => {
  for (const record of [
    { fecha: "2027-11-07", hora: "01:30", timeZone: "America/New_York" },
    { fecha: "2027-03-14", hora: "02:30", timeZone: "America/New_York" },
    { fecha: "2027-01-01", hora: "10:00", startAtIso: "2027-01-01T16:00:00Z" },
    { startAtIso: "2027-01-01T15:00:00" },
    { startAtIso: "invalid" },
    { startAtIso: "2099-02-30T10:00:00Z" },
    { startAtIso: "2099-01-01T24:00:00Z" },
    { fecha: "2099-01-01", hora: "10:00", timeZone: "America/Lima", timezone: "Europe/Madrid" },
    { startAtIso: "2027-01-01T15:00:00Z", startAt: new Date("2027-01-01T16:00:00Z") },
    { fecha: "2027-02-30", hora: "10:00" },
  ]) assert.equal(resolveSchedule(record).status, "unresolved", JSON.stringify(record));
});
test("REV-PAC-04B and month/year bounds use Lima with half-open calendar ranges", () => {
  const now = new Date("2099-01-16T00:30:00Z");
  assert.equal(inAgendaRange({date: "2099-01-15", startTime: "23:30"}, "month", now), true);
  assert.equal(inAgendaRange({date: "2099-01-15", startTime: "18:30"}, "month", now), false);
  const boundary = new Date("2099-01-01T02:00:00Z");
  assert.deepEqual(agendaRange("month", boundary), {start: "2098-12-31", end: "2099-01-01"});
  assert.deepEqual(agendaRange("next", boundary), {start: "2099-01-01", end: "2099-02-01"});
  assert.equal(inAgendaRange({date: "2098-12-31", startTime: "23:30"}, "month", boundary), true);
});
