export const syntheticEligibility = {version: "synthetic-pilot-v1", minimumAge: 18,
  ageBasis: "declared_birth_date", timeZone: "America/Lima", status: "synthetic", approvalReference: "fixture-only"};
const retained = ["admin_audit", "payment_audit", "account_requests", "terapias", "citas", "therapy_goals", "therapy_goals/progress", "exercises",
  "emotional_checkins", "longitudinal_history", "notifications", "feedback", "feddback", "support_requests",
  "payment_receipts", "professional_transfers", "professional_obligations", "payment_operations", "psychologist_requests", "therapists", "therapists/rate_history", "appointment_operations"];
const removed = ["users", "users/consents", "profiles", "conversations", "conversations/messages", "profile_chat_operations", "profile_chat_quotas"];
export const syntheticPrivacy = {version: "synthetic-privacy-v1", status: "synthetic", approvalReference: "fixture-only",
  authentication: "delete", storage: "not_used_verified", categories: Object.fromEntries([
    ...retained.map(key => [key, {action: "retain", minimumAgeDays: 0, basis: "synthetic retention case"}]),
    ...removed.map(key => [key, {action: "delete", minimumAgeDays: 0, basis: "synthetic deletion case"}]),
  ])};

export const syntheticCommercial = {version: "synthetic-commercial-v1", status: "synthetic", approvalReference: "fixture-only",
  merchantAccount: "synthetic-merchant", holdMinutes: 60, submittedExpiration: "preserve_for_review",
  patientPastCancellation: "allow", patientPastReschedule: "allow", patientCancellationCutoffMinutes: 0, patientRescheduleCutoffMinutes: 0, refundMode: "manual_review",
  obligationTrigger: "payment_confirmed", rounding: "floor_professional_remainder_platform"};
