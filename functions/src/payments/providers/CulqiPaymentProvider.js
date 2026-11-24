const {MarketplacePaymentProvider} = require("./MarketplacePaymentProvider");

// Culqi keeps the card number and CVV. Only token, customer, card and charge IDs
// cross this boundary; never send a PAN through a callable or store it in Firestore.
class CulqiPaymentProvider extends MarketplacePaymentProvider {
  constructor(config, fetchImpl = fetch) {
    super();
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async createCustomer(input) {
    const {payload} = await this.request("/v2/customers", {
      method: "POST",
      body: {
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        address: input.address,
        address_city: input.addressCity,
        country_code: "PE",
        phone_number: input.phoneNumber,
      },
    });
    if (!payload.id || !String(payload.id).startsWith("cus_")) {
      throw providerError("PAYMENT_PROVIDER_UNAVAILABLE", true);
    }
    return {customerId: String(payload.id)};
  }

  async createCard(input) {
    const {statusCode, payload} = await this.request("/v2/cards", {
      method: "POST",
      body: {
        customer_id: input.customerId,
        token_id: input.tokenId,
        ...(input.deviceId ? {device_finger_print_id: input.deviceId} : {}),
        ...(input.authentication3DS ? {authentication_3DS: input.authentication3DS} : {}),
      },
    });
    if (statusCode === 200 && payload.action_code === "REVIEW") {
      return {requires3DS: true};
    }
    if (!payload.id || !String(payload.id).startsWith("crd_")) {
      throw providerError("PAYMENT_PROVIDER_UNAVAILABLE", true);
    }
    return {
      cardId: String(payload.id),
      customerId: String(payload.customer_id || input.customerId),
      brand: String(payload.token?.iin?.card_brand || "Tarjeta").slice(0, 40),
      lastFour: String(payload.token?.last_four || "").slice(-4),
      tokenId: String(payload.token?.id || input.tokenId),
    };
  }

  async deleteCard(input) {
    await this.request(`/v2/cards/${encodeURIComponent(input.cardId)}`, {
      method: "DELETE",
    });
  }

  async createPayment(input) {
    const {statusCode, payload} = await this.request("/v2/charges", {
      method: "POST",
      headers: {"X-Charge-Channel": "recurrent"},
      body: {
        amount: input.grossAmount,
        currency_code: "PEN",
        email: input.email,
        source_id: input.cardId,
        capture: true,
        description: "Sesion profesional Lurems",
        installments: 0,
        metadata: {booking_reference: input.externalReference},
        antifraud_details: {
          first_name: input.firstName,
          last_name: input.lastName,
          phone_number: input.phoneNumber,
          device_finger_print_id: input.deviceId,
        },
        ...(input.authentication3DS ? {authentication_3DS: input.authentication3DS} : {}),
      },
    });
    if (statusCode === 200 && payload.action_code === "REVIEW") {
      return {requires3DS: true};
    }
    return normalizeCulqiCharge(payload);
  }

  async getPayment(input) {
    const {payload} = await this.request(
        `/v2/charges/${encodeURIComponent(input.providerPaymentId)}`,
    );
    return normalizeCulqiCharge(payload);
  }

  async refundPayment(input) {
    const {payload} = await this.request("/v2/refunds", {
      method: "POST",
      body: {
        amount: input.amount,
        charge_id: input.providerPaymentId,
        reason: "solicitud_comprador",
      },
    });
    return {
      providerRefundId: String(payload.id || ""),
      providerPaymentId: String(payload.charge_id || input.providerPaymentId),
      status: String(payload.status || "").toLowerCase() === "completa" ?
        "approved" : "pending",
      amount: Number(payload.amount || input.amount),
    };
  }

  async processWebhookEvent(input) {
    const body = input.body || {};
    let data = body.data || {};
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        throw providerError("INVALID_WEBHOOK");
      }
    }
    const providerPaymentId = data.charge_id || data.id ||
      data.object?.charge_id || data.object?.id;
    if (!/^chr_(test|live)_[a-zA-Z0-9]+$/.test(String(providerPaymentId || ""))) {
      throw providerError("INVALID_WEBHOOK");
    }
    return {
      providerPaymentId: String(providerPaymentId),
      providerEventId: String(body.id || `culqi:${providerPaymentId}:${body.type || "charge"}`),
    };
  }

  async request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    let response;
    try {
      response = await this.fetchImpl(`${this.config.culqi.apiBaseUrl}${path}`, {
        method: options.method || "GET",
        headers: {
          "Authorization": `Bearer ${this.config.culqi.secretKey}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch {
      // A timeout after POST has an unknown outcome. Never blindly retry a charge.
      throw providerError("PAYMENT_PROVIDER_UNAVAILABLE", options.method === "POST");
    } finally {
      clearTimeout(timer);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const definitiveRejection = response.status >= 400 && response.status < 500 &&
        response.status !== 429;
      throw providerError(definitiveRejection ? "PAYMENT_REJECTED" :
        "PAYMENT_PROVIDER_UNAVAILABLE", !definitiveRejection && options.method === "POST");
    }
    return {statusCode: response.status, payload};
  }
}

function normalizeCulqiCharge(charge) {
  if (charge.object !== "charge" || !String(charge.id || "").startsWith("chr_")) {
    throw providerError("PAYMENT_PROVIDER_UNAVAILABLE", true);
  }
  const feeDetails = Array.isArray(charge.fee_details) ? charge.fee_details : [];
  const feeAmount = feeDetails.reduce((sum, fee) =>
    sum + Number(fee.total_amount ?? fee.amount ?? 0), 0);
  const state = String(charge.state || "").toLowerCase();
  const refundedAmount = Number(charge.amount_refunded || 0);
  const amount = Number(charge.amount);
  const status = state === "contracargo" ? "charged_back" :
    refundedAmount >= amount && amount > 0 ? "refunded" :
    refundedAmount > 0 ? "partially_refunded" :
      state === "exitosa" || charge.response_code === "venta_exitosa" ?
        "approved" : state === "pendiente" ? "pending" : "rejected";
  return {
    providerEventId: `culqi:${charge.id}:${status}`,
    providerPaymentId: String(charge.id),
    providerAccountId: "lurems-culqi",
    status,
    currency: String(charge.currency || charge.currency_code || ""),
    grossAmount: amount,
    processorFeeAmount: feeAmount,
    externalReference: String(charge.metadata?.booking_reference || ""),
    approvedAt: status === "approved" ? new Date(Number(charge.date || Date.now())).toISOString() : null,
    failureCode: status === "rejected" ? String(charge.response_code || "rejected") : "",
  };
}

function providerError(code, outcomeUnknown = false) {
  const error = new Error(code);
  error.code = code;
  error.outcomeUnknown = outcomeUnknown;
  return error;
}

module.exports = {CulqiPaymentProvider, normalizeCulqiCharge};
