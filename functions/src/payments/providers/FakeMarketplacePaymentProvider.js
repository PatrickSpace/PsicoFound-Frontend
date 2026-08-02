const crypto = require("node:crypto");
const {MarketplacePaymentProvider} = require("./MarketplacePaymentProvider");

const ALLOWED_SCENARIOS = new Set([
  "approved",
  "pending",
  "rejected",
  "provider_error",
  "refunded",
  "chargeback",
  "duplicate_webhook",
  "delayed_webhook",
]);

class FakeMarketplacePaymentProvider extends MarketplacePaymentProvider {
  constructor(config) {
    super();
    this.config = config;
  }

  async createSellerAuthorizationUrl(input) {
    return {
      authorizationUrl: `${this.config.appBaseUrl}/configuracion?fakePaymentAccount=connected&state=${encodeURIComponent(input.state)}`,
    };
  }

  async exchangeAuthorizationCode(input) {
    return {
      providerAccountId: `fake-seller-${input.psychologistId}`,
      providerUserId: `fake-user-${input.psychologistId}`,
      accessToken: `fake-token-${input.psychologistId}`,
      refreshToken: "",
      expiresIn: null,
      isFake: true,
    };
  }

  async disconnectSeller() {}

  async createPayment(input) {
    const scenario = normalizeScenario(
        input.metadata?.fakeScenario || this.config.fakePaymentDefaultResult,
    );
    if (scenario === "provider_error") {
      const error = new Error("Fake payment provider error");
      error.code = "PAYMENT_PROVIDER_UNAVAILABLE";
      throw error;
    }
    const providerPaymentId = `fake-pay-${stableHash(input.idempotencyKey)}`;
    const status = scenario === "duplicate_webhook" ? "approved" :
      scenario === "delayed_webhook" ? "pending" : scenario;
    return normalizeFakePayment({
      providerPaymentId,
      status,
      input,
      scenario,
    });
  }

  async getPayment(input) {
    return normalizeFakePayment({
      providerPaymentId: input.providerPaymentId,
      status: input.status || "approved",
      input,
      scenario: input.status || "approved",
    });
  }

  async refundPayment(input) {
    return {
      providerRefundId: `fake-refund-${stableHash(input.idempotencyKey)}`,
      providerPaymentId: input.providerPaymentId,
      status: "approved",
      amount: input.amount,
      isFake: true,
    };
  }

  async processWebhookEvent(input) {
    return input.event;
  }
}

function normalizeFakePayment({providerPaymentId, status, input, scenario}) {
  return {
    providerEventId: `fake-event-${providerPaymentId}-${status}`,
    providerPaymentId,
    providerAccountId: input.providerAccountId || "fake-seller",
    status,
    currency: input.currency || "PEN",
    grossAmount: input.grossAmount,
    processorFeeAmount: Number(input.processorFeeAmount || 0),
    externalReference: input.externalReference,
    approvedAt: status === "approved" ? new Date().toISOString() : null,
    failureCode: status === "rejected" ? "fake_rejected" : "",
    metadata: {scenario, isFake: true},
  };
}

function normalizeScenario(value) {
  const scenario = String(value || "approved").toLowerCase();
  return ALLOWED_SCENARIOS.has(scenario) ? scenario : "approved";
}

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 20);
}

module.exports = {ALLOWED_SCENARIOS, FakeMarketplacePaymentProvider};
