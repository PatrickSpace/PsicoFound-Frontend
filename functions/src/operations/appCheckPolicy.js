function appCheckOptions(env = process.env) {
  const emulator = env.FUNCTIONS_EMULATOR === "true" &&
    /^demo-/.test(env.GCLOUD_PROJECT || "");
  if (emulator) return {enforceAppCheck: false};
  // Observation is an explicit staging rollout, never a production bypass.
  const observe = env.APP_ENV === "staging" && env.APP_CHECK_MODE === "observe";
  return {enforceAppCheck: !observe};
}
module.exports = {appCheckOptions};
