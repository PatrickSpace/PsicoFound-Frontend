const {PaymentDomainError} = require("./paymentErrors");

function calculatePaymentAllocation(input) {
  const grossAmount = assertMoney(input.grossAmount, "grossAmount");
  const processorFeeAmount = assertMoney(
      input.processorFeeAmount || 0,
      "processorFeeAmount",
      true,
  );
  const platformPercentage = assertPercentage(input.platformCommissionPercentage);
  const psychologistPercentage = assertPercentage(input.psychologistPercentage);
  const feeBearer = input.processorFeeBearer || "platform";

  if (platformPercentage + psychologistPercentage !== 100) {
    throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
  }
  if (!["platform", "psychologist", "patient"].includes(feeBearer)) {
    throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
  }

  const psychologistGrossAmount = Math.floor(
      grossAmount * psychologistPercentage / 100,
  );
  const platformCommissionGrossAmount = grossAmount - psychologistGrossAmount;
  let platformNetAmount = platformCommissionGrossAmount;
  let psychologistNetAmount = psychologistGrossAmount;

  if (feeBearer === "platform") platformNetAmount -= processorFeeAmount;
  if (feeBearer === "psychologist") psychologistNetAmount -= processorFeeAmount;
  if (platformNetAmount < 0 || psychologistNetAmount < 0) {
    throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
  }

  return {
    grossAmount,
    platformCommissionGrossAmount,
    psychologistGrossAmount,
    processorFeeAmount,
    platformNetAmount,
    psychologistNetAmount,
    totalAllocatedAmount: platformNetAmount + psychologistNetAmount + processorFeeAmount,
  };
}

function assertMoney(value, name, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new TypeError(`${name} must be an integer amount in cents`);
  }
  return value;
}

function assertPercentage(value) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
  }
  return value;
}

module.exports = {calculatePaymentAllocation};
