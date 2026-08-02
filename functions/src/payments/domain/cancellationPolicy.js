function evaluateCancellationPolicy({startsAtMs, cancelledAtMs, cancelledBy}) {
  const fullRefundReasons = new Set(["psychologist", "platform", "technical"]);
  if (fullRefundReasons.has(cancelledBy)) {
    return {refundable: true, refundPercentage: 100, reason: cancelledBy};
  }
  const hoursBeforeSession = (startsAtMs - cancelledAtMs) / (60 * 60 * 1000);
  if (cancelledBy === "patient" && hoursBeforeSession > 24) {
    return {refundable: true, refundPercentage: 100, reason: "patient_over_24h"};
  }
  return {refundable: false, refundPercentage: 0, reason: "patient_under_24h"};
}

module.exports = {evaluateCancellationPolicy};
