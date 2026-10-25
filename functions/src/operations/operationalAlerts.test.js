const test = require("node:test");
const assert = require("node:assert/strict");
const {shouldRecordOperationalAlert} = require("./operationalAlerts");

test("only actionable platform failures create operational alerts", () => {
  for (const code of ["internal", "resource-exhausted", "unavailable"]) {
    assert.equal(shouldRecordOperationalAlert(code), true);
  }
  for (const code of ["permission-denied", "invalid-argument", "not-found"]) {
    assert.equal(shouldRecordOperationalAlert(code), false);
  }
});
