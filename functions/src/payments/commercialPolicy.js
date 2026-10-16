/* eslint-disable max-len */
const {createHash} = require("node:crypto");
const {HttpsError} = require("firebase-functions/v2/https");
const {resolveSchedule} = require("../appointments/schedulePolicy.mjs");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function fingerprint(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function validateCommercialPolicy(policy, env = process.env) {
  const synthetic = env.FUNCTIONS_EMULATOR === "true" && (env.GCLOUD_PROJECT || "").startsWith("demo-");
  const validText = (s) => typeof s === "string" && s.trim().length > 0 && s.length <= 180;
  const minutes = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 525600;
  if (!policy || !validText(policy.version) || !validText(policy.approvalReference) ||
    !validText(policy.merchantAccount) || !["approved", ...(synthetic ? ["synthetic"] : [])].includes(policy.status) ||
    !minutes(policy.holdMinutes) || policy.holdMinutes === 0 ||
    !["preserve_for_review", "expire"].includes(policy.submittedExpiration) ||
    !["allow", "manual_review"].includes(policy.patientPastReschedule) ||
    !["allow", "manual_review"].includes(policy.patientPastCancellation) ||
    !minutes(policy.patientCancellationCutoffMinutes) || !minutes(policy.patientRescheduleCutoffMinutes) ||
    policy.refundMode !== "manual_review" || policy.obligationTrigger !== "payment_confirmed" ||
    policy.rounding !== "floor_professional_remainder_platform") {
    throw new HttpsError("failed-precondition", "La política comercial está pendiente de configuración y aprobación.");
  }
  return {...policy, fingerprint: fingerprint(Object.fromEntries(Object.entries(policy).filter(([key]) => key !== "fingerprint")))};
}
function commercialPolicy(env = process.env) {
  let policy;
  try {
    policy = JSON.parse(env.COMMERCIAL_POLICY_JSON || "null");
  } catch {/* Fail closed below. */}
  return validateCommercialPolicy(policy, env);
}
function snapshotPolicy(snapshot) {
  const policy = validateCommercialPolicy(snapshot);
  if (snapshot.fingerprint !== policy.fingerprint) throw new HttpsError("failed-precondition", "La reserva necesita revisar su política comercial.");
  return policy;
}
function assertCommercialChange(appointment, actorMode, kind, now = Date.now()) {
  if (!appointment.paymentOperationId) return; // Historical non-commercial appointment.
  const policy = snapshotPolicy(appointment.paymentSnapshot?.commercialPolicy);
  if (actorMode !== "patient") return;
  const start = resolveSchedule(appointment).start;
  const pastRule = kind === "cancel" ? policy.patientPastCancellation : policy.patientPastReschedule;
  if (start && start.getTime() <= now && pastRule === "allow") return;
  const cutoff = kind === "cancel" ? policy.patientCancellationCutoffMinutes : policy.patientRescheduleCutoffMinutes;
  if (!start || start.getTime() - now < cutoff * 60000) {
    throw new HttpsError("failed-precondition", "El plazo de esta reserva requiere solicitar revisión a soporte.");
  }
}
function obligationAmounts(operation) {
  const amount = operation.amountMinor;
  const percent = operation.rateSnapshot?.psychologistPercent;
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new HttpsError("failed-precondition", "El importe necesita revisión.");
  }
  const calculatedMinor = Math.floor(amount * percent / 100);
  return {calculatedMinor, platformMinor: amount - calculatedMinor};
}
module.exports = {commercialPolicy, validateCommercialPolicy, snapshotPolicy, assertCommercialChange, fingerprint, obligationAmounts};
