/* eslint-disable max-len */
const {HttpsError} = require("firebase-functions/v2/https");
function assertProviderApproved(env = process.env) {
  let policy;
  try {
    policy = JSON.parse(env.AI_USE_APPROVAL_JSON || "null");
  } catch (_) {/* Closed below. */}
  if (env.FUNCTIONS_EMULATOR === "true" || !policy || policy.status !== "approved" ||
      policy.provider !== "openai" || policy.model !== "gpt-6-luna" ||
      policy.plan !== "paid" || policy.scope !== "hybrid_survey_matching" ||
      !policy.version || !policy.approvalReference || !policy.billingEvidenceReference ||
      !policy.clinicalReviewReference || !policy.privacyReviewReference ||
      (env.PRIMARY_AI_PROVIDER && env.PRIMARY_AI_PROVIDER !== "openai") ||
      (env.AI_MODEL && env.AI_MODEL !== "gpt-6-luna") ||
      env.FALLBACK_AI_PROVIDER) {
    throw new HttpsError("failed-precondition", "El uso del proveedor todavía requiere configuración y aprobaciones. La ayuda sigue disponible.",
        {reason: "provider_unavailable"});
  }
  return policy;
}
module.exports = {assertProviderApproved};
