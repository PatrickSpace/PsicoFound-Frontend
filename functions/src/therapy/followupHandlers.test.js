const test = require("node:test");
const assert = require("node:assert/strict");
const {inferInitialAppointmentId} = require("./followupHandlers");

test("initial survey access is anchored to the earliest appointment", () => {
  const appointments = [
    {id: "later", fecha: "2026-12-10", hora: "10:00"},
    {id: "first", fecha: "2026-11-10", hora: "10:00"},
  ];
  assert.equal(inferInitialAppointmentId(appointments), "first");
});

test("legacy initial appointment inference stays deterministic", () => {
  assert.equal(inferInitialAppointmentId([
    {id: "b"},
    {id: "a"},
  ]), "a");
});
