const test = require("node:test");
const assert = require("node:assert/strict");
const {validDate, validTimeZone} = require("./accountHandlers");

test("validTimeZone acepta zonas IANA y rechaza valores arbitrarios", () => {
  assert.equal(validTimeZone("America/Lima"), true);
  assert.equal(validTimeZone("Europe/Madrid"), true);
  assert.equal(validTimeZone("Lurems/Nowhere"), false);
});

test("validDate acepta fechas pasadas y rechaza fechas inválidas", () => {
  assert.equal(validDate("1990-05-17"), true);
  assert.equal(validDate("2024-02-30"), false);
  assert.equal(validDate("17/05/1990"), false);
  assert.equal(validDate("2999-01-01"), false);
});
