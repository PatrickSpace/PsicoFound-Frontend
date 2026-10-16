/* eslint-disable max-len */
const {HttpsError} = require("firebase-functions/v2/https");
function assertProviderApproved(env = process.env) {
  let policy;
  try {
    policy = JSON.parse(env.AI_USE_APPROVAL_JSON || "null");
  } catch (_) {/* Closed below. */}
  if (env.FUNCTIONS_EMULATOR === "true" || !policy || policy.status !== "approved" ||
      policy.provider !== "gemini" || policy.plan !== "paid" || policy.scope !== "administrative_matching" ||
      !policy.version || !policy.approvalReference || !policy.billingEvidenceReference ||
      !policy.clinicalReviewReference || !policy.privacyReviewReference ||
      (env.PRIMARY_AI_PROVIDER && env.PRIMARY_AI_PROVIDER !== "gemini") ||
      (env.FALLBACK_AI_PROVIDER && env.FALLBACK_AI_PROVIDER !== "gemini")) {
    throw new HttpsError("failed-precondition", "El uso del proveedor todavía requiere configuración y aprobaciones. La ayuda sigue disponible.");
  }
  return policy;
}
module.exports = {assertProviderApproved};
