const test = require("node:test");
const assert = require("node:assert/strict");
const {evaluateCancellationPolicy} = require("./cancellationPolicy");

const day = 24 * 60 * 60 * 1000;

test("patient receives full refund more than 24 hours before", () => {
  assert.equal(evaluateCancellationPolicy({
    startsAtMs: 2 * day,
    cancelledAtMs: 0,
    cancelledBy: "patient",
  }).refundable, true);
});

test("patient does not receive automatic refund inside 24 hours", () => {
  assert.equal(evaluateCancellationPolicy({
    startsAtMs: day,
    cancelledAtMs: 1,
    cancelledBy: "patient",
  }).refundable, false);
});

test("psychologist and platform cancellation receive full refund", () => {
  assert.equal(evaluateCancellationPolicy({
    startsAtMs: 0,
    cancelledAtMs: 1,
    cancelledBy: "psychologist",
  }).refundPercentage, 100);
  assert.equal(evaluateCancellationPolicy({
    startsAtMs: 0,
    cancelledAtMs: 1,
    cancelledBy: "platform",
  }).refundPercentage, 100);
});
