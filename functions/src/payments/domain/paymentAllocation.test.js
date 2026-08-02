const test = require("node:test");
const assert = require("node:assert/strict");
const {calculatePaymentAllocation} = require("./paymentAllocation");

const base = {
  platformCommissionPercentage: 30,
  psychologistPercentage: 70,
  processorFeeBearer: "platform",
};

test("allocates S/100.00 with processor fee paid by platform", () => {
  assert.deepEqual(calculatePaymentAllocation({
    ...base,
    grossAmount: 10000,
    processorFeeAmount: 400,
  }), {
    grossAmount: 10000,
    platformCommissionGrossAmount: 3000,
    psychologistGrossAmount: 7000,
    processorFeeAmount: 400,
    platformNetAmount: 2600,
    psychologistNetAmount: 7000,
    totalAllocatedAmount: 10000,
  });
});

for (const amount of [9999, 2500, 100, 101]) {
  test(`does not lose cents for ${amount}`, () => {
    const result = calculatePaymentAllocation({...base, grossAmount: amount});
    assert.equal(result.totalAllocatedAmount, amount);
    assert.equal(
        result.platformCommissionGrossAmount + result.psychologistGrossAmount,
        amount,
    );
  });
}

test("rejects percentages that do not sum 100", () => {
  assert.throws(() => calculatePaymentAllocation({
    ...base,
    grossAmount: 10000,
    psychologistPercentage: 69,
  }));
});

test("rejects a processor fee larger than platform share", () => {
  assert.throws(() => calculatePaymentAllocation({
    ...base,
    grossAmount: 100,
    processorFeeAmount: 31,
  }));
});
