const PAYMENT_TRANSITIONS = {
  created: ["pending", "processing", "approved", "rejected", "provider_error"],
  pending: ["processing", "approved", "rejected", "cancelled", "manual_review"],
  processing: ["pending", "approved", "rejected", "provider_error", "manual_review"],
  rejected: ["pending", "processing", "approved"],
  provider_error: ["pending", "processing", "approved", "rejected"],
  approved: ["refund_pending", "charged_back", "manual_review"],
  refund_pending: ["refunded", "approved", "manual_review"],
  refunded: [],
  partially_refunded: ["refunded", "charged_back"],
  charged_back: [],
  cancelled: [],
  manual_review: ["approved", "refund_pending", "refunded", "charged_back"],
};

function canTransitionPayment(from, to) {
  if (from === to) return true;
  return (PAYMENT_TRANSITIONS[from] || []).includes(to);
}

function normalizeProviderStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved") return "approved";
  if (["pending", "in_process", "in_mediation", "authorized"].includes(normalized)) {
    return "pending";
  }
  if (["rejected", "cancelled"].includes(normalized)) return "rejected";
  if (["refunded", "partially_refunded", "charged_back"].includes(normalized)) {
    return normalized;
  }
  return "provider_error";
}

module.exports = {canTransitionPayment, normalizeProviderStatus};
