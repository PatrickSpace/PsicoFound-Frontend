/* eslint-disable max-len */
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertPaymentTransition,
  quoteFromRate,
} = require("./paymentOperationHandlers");

const {validateCommercialPolicy} = require("./commercialPolicy");
const policy = validateCommercialPolicy({version: "unit-v1", status: "approved", approvalReference: "synthetic-unit-test",
  merchantAccount: "unit", holdMinutes: 60, submittedExpiration: "preserve_for_review",
  patientPastCancellation: "allow", patientPastReschedule: "allow", patientCancellationCutoffMinutes: 0, patientRescheduleCutoffMinutes: 0, refundMode: "manual_review",
  obligationTrigger: "payment_confirmed", rounding: "floor_professional_remainder_platform"});

test("booking quote snapshots the selected immutable rate", () => {
  const quote = quoteFromRate(
      "therapist-a",
      {paymentRateSelectionVersion: 4},
      "rate-120",
      {
        version: 3,
        name: "Sesión individual",
        amountMinor: 12000,
        currency: "PEN",
        paymentUrl: "https://mpago.la/synthetic",
        isTest: false,
        platformPercent: 20,
        psychologistPercent: 80,
      },
      policy,
  );

  assert.match(quote.quoteId, /^[a-f0-9]{64}$/);
  assert.equal(quote.amountMinor, 12000);
  assert.equal(quote.currency, "PEN");
  assert.equal(quote.reconciliation, "manual");
  assert.equal(quote.conditions.openingLinkDoesNotConfirmPayment, true);
  assert.equal(quote.conditions.providerReceiptIsNotFiscalDocument, true);
  assert.equal(quote.conditions.expirationPolicyConfigured, true);
});

test("payment reconciliation accepts explicit state transitions", () => {
  assert.throws(() => assertPaymentTransition("pending", "expired"));
  assert.equal(assertPaymentTransition("submitted", "confirmed"), "confirmed");
  assert.equal(
      assertPaymentTransition("refund_review", "refunded"),
      "refunded",
  );

  for (const [current, next] of [
    ["pending", "confirmed"],
    ["confirmed", "refunded"],
    ["cancelled", "confirmed"],
    ["refunded", "submitted"],
  ]) {
    assert.throws(
        () => assertPaymentTransition(current, next),
        (error) => error.code === "failed-precondition",
    );
  }
});
