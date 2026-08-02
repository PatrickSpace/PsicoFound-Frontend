const crypto = require("node:crypto");
const {MarketplacePaymentProvider} = require("./MarketplacePaymentProvider");
const {normalizeProviderStatus} = require("../domain/paymentStates");

const API_BASE_URL = "https://api.mercadopago.com";
const AUTHORIZATION_URL = "https://auth.mercadopago.com.pe/authorization";

class MercadoPagoMarketplaceProvider extends MarketplacePaymentProvider {
  constructor(config) {
    super();
    this.config = config;
  }

  async createSellerAuthorizationUrl(input) {
    const url = new URL(AUTHORIZATION_URL);
    url.searchParams.set("client_id", this.config.mercadoPago.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("platform_id", "mp");
    url.searchParams.set("redirect_uri", this.config.mercadoPago.oauthRedirectUri);
    url.searchParams.set("state", input.state);
    return {authorizationUrl: url.toString()};
  }

  async exchangeAuthorizationCode(input) {
    const response = await this.request("/oauth/token", {
      method: "POST",
      body: {
        client_id: this.config.mercadoPago.clientId,
        client_secret: this.config.mercadoPago.clientSecret,
        grant_type: "authorization_code",
        code: input.code,
        redirect_uri: this.config.mercadoPago.oauthRedirectUri,
      },
    });
    return {
      providerAccountId: String(response.user_id || ""),
      providerUserId: String(response.user_id || ""),
      accessToken: response.access_token,
      refreshToken: response.refresh_token || "",
      expiresIn: response.expires_in || null,
      isFake: false,
    };
  }

  async disconnectSeller() {}

  async createPayment(input) {
    const response = await this.request("/v1/payments", {
      method: "POST",
      accessToken: input.sellerAccessToken,
      idempotencyKey: input.idempotencyKey,
      body: {
        transaction_amount: centsToAmount(input.grossAmount),
        token: input.paymentToken,
        description: "Sesión profesional Lurems",
        installments: input.installments || 1,
        payment_method_id: input.paymentMethodId,
        payer: sanitizePayer(input.payer),
        external_reference: input.externalReference,
        application_fee: centsToAmount(input.platformCommissionGrossAmount),
        notification_url: this.config.mercadoPago.webhookUrl,
      },
    });
    return normalizePayment(response);
  }

  async getPayment(input) {
    const response = await this.request(`/v1/payments/${encodeURIComponent(input.providerPaymentId)}`, {
      accessToken: input.sellerAccessToken,
    });
    return normalizePayment(response);
  }

  async refundPayment(input) {
    const response = await this.request(
        `/v1/payments/${encodeURIComponent(input.providerPaymentId)}/refunds`,
        {
          method: "POST",
          accessToken: input.sellerAccessToken,
          idempotencyKey: input.idempotencyKey,
          body: {amount: centsToAmount(input.amount)},
        },
    );
    return {
      providerRefundId: String(response.id || ""),
      providerPaymentId: String(response.payment_id || input.providerPaymentId),
      status: response.status === "approved" ? "approved" : "pending",
      amount: amountToCents(response.amount || centsToAmount(input.amount)),
      isFake: false,
    };
  }

  async processWebhookEvent(input) {
    if (!validateWebhookSignature(input, this.config.mercadoPago.webhookSecret)) {
      const error = new Error("Invalid Mercado Pago webhook signature");
      error.code = "INVALID_WEBHOOK";
      throw error;
    }
    return {
      providerEventId: String(input.body?.id || input.requestId || input.dataId),
      providerPaymentId: String(input.dataId),
      type: input.body?.type || "payment",
    };
  }

  async request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
    if (options.idempotencyKey) headers["X-Idempotency-Key"] = options.idempotencyKey;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(`Mercado Pago request failed (${response.status})`);
        error.code = response.status === 429 ?
          "PAYMENT_PROVIDER_UNAVAILABLE" : "PAYMENT_PROVIDER_UNAVAILABLE";
        error.providerStatus = response.status;
        throw error;
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizePayment(payment) {
  const fees = Array.isArray(payment.fee_details) ? payment.fee_details : [];
  const processorFee = fees
      .filter((fee) => fee.type !== "application_fee")
      .reduce((sum, fee) => sum + amountToCents(fee.amount || 0), 0);
  return {
    providerEventId: `payment:${payment.id}:${payment.status}`,
    providerPaymentId: String(payment.id || ""),
    providerAccountId: String(payment.collector_id || ""),
    status: normalizeProviderStatus(payment.status),
    currency: payment.currency_id || "",
    grossAmount: amountToCents(payment.transaction_amount || 0),
    processorFeeAmount: processorFee,
    externalReference: payment.external_reference || "",
    approvedAt: payment.date_approved || null,
    failureCode: payment.status_detail || "",
    metadata: {liveMode: Boolean(payment.live_mode)},
  };
}

function validateWebhookSignature(input, secret) {
  if (!input.xSignature || !input.xRequestId || !input.dataId || !secret) return false;
  const parts = Object.fromEntries(
      input.xSignature.split(",").map((part) => part.trim().split("=")),
  );
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${String(input.dataId).toLowerCase()};request-id:${input.xRequestId};ts:${parts.ts};`;
  const digest = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const expected = Buffer.from(digest, "hex");
  const received = Buffer.from(parts.v1, "hex");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function sanitizePayer(payer = {}) {
  const result = {email: String(payer.email || "").trim()};
  if (payer.identificationType && payer.identificationNumber) {
    result.identification = {
      type: String(payer.identificationType),
      number: String(payer.identificationNumber),
    };
  }
  return result;
}

function centsToAmount(cents) {
  return Number((Number(cents) / 100).toFixed(2));
}

function amountToCents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

module.exports = {
  MercadoPagoMarketplaceProvider,
  amountToCents,
  centsToAmount,
  validateWebhookSignature,
};
