const test = require("node:test");
const assert = require("node:assert/strict");
const {appCheckOptions} = require("./appCheckPolicy");
test("App Check defaults to enforced; emulation requires demo project", () => {
  for (const env of [{}, {APP_ENV: "production", APP_CHECK_MODE: "observe"},
    {FUNCTIONS_EMULATOR: "true", GCLOUD_PROJECT: "real-project"}]) {
    assert.equal(appCheckOptions(env).enforceAppCheck, true);
  }
  assert.equal(appCheckOptions({APP_ENV: "staging", APP_CHECK_MODE: "observe"})
      .enforceAppCheck, false);
  assert.equal(appCheckOptions({FUNCTIONS_EMULATOR: "true",
    GCLOUD_PROJECT: "demo-synthetic"}).enforceAppCheck, false);
});
