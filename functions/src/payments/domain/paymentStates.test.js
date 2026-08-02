const test = require("node:test");
const assert = require("node:assert/strict");
const {canTransitionPayment, normalizeProviderStatus} = require("./paymentStates");

test("supports valid payment transitions", () => {
  assert.equal(canTransitionPayment("created", "approved"), true);
  assert.equal(canTransitionPayment("approved", "refund_pending"), true);
  assert.equal(canTransitionPayment("refund_pending", "refunded"), true);
});

test("rejects unsafe terminal transitions", () => {
  assert.equal(canTransitionPayment("refunded", "approved"), false);
  assert.equal(canTransitionPayment("charged_back", "approved"), false);
});

test("normalizes provider states", () => {
  assert.equal(normalizeProviderStatus("in_process"), "pending");
  assert.equal(normalizeProviderStatus("cancelled"), "rejected");
  assert.equal(normalizeProviderStatus("charged_back"), "charged_back");
});
