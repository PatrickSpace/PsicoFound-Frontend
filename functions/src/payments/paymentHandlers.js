const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {getPaymentConfig} = require("./config/paymentConfig");
const {toHttpsError, PaymentDomainError} = require("./domain/paymentErrors");
const {
  createMarketplacePaymentProvider,
} = require("./providers/createMarketplacePaymentProvider");
const {
  MarketplacePaymentService,
} = require("./services/marketplacePaymentService");

function createService() {
  const config = getPaymentConfig();
  return new MarketplacePaymentService({
    db: admin.firestore(),
    config,
    provider: createMarketplacePaymentProvider(config),
  });
}

function callable(handler) {
  return async (request) => {
    try {
      if (!request.auth?.uid) throw new PaymentDomainError("AUTH_REQUIRED");
      return await handler(createService(), request.auth.uid, request.data || {});
    } catch (error) {
      logger.error("Marketplace payment callable failed", {
        errorType: error.code || error.name,
      });
      throw toHttpsError(error);
    }
  };
}

const createPaymentAccountConnection = callable((service, uid) =>
  service.createPaymentAccountConnection(uid));

const createMercadoPagoAuthorizationUrl = callable((service, uid) =>
  service.createSellerAuthorizationUrl(uid));

const getPaymentAccountStatus = callable((service, uid) =>
  service.getPaymentAccountStatus(uid));

const updatePsychologistPaymentSettings = callable((service, uid, data) =>
  service.updatePaymentSettings(uid, data));

const disconnectPaymentAccount = callable((service, uid) =>
  service.disconnectPaymentAccount(uid));

const createBookingHold = callable((service, uid, data) =>
  service.createBookingHold(uid, data));

const createBookingPayment = callable((service, uid, data) =>
  service.createBookingPayment(uid, data));

const getBookingPaymentStatus = callable((service, uid, data) =>
  service.getBookingPaymentStatus(uid, data));

const listMyPaymentBookings = callable((service, uid) =>
  service.listMyBookings(uid));

const expireBookingHold = callable(async (service, uid, data) => {
  if (!data.bookingId) throw new PaymentDomainError("BOOKING_NOT_FOUND");
  return service.expireBookingHold(data.bookingId);
});

const cancelBooking = callable((service, uid, data) =>
  service.cancelBooking(uid, data));

const requestBookingRefund = callable((service, uid, data) =>
  service.refundBookingPayment(uid, data));

const simulatePaymentEvent = callable((service, uid, data) =>
  service.simulatePaymentEvent(uid, data));

async function mercadoPagoOAuthCallback(request, response) {
  try {
    const service = createService();
    const result = await service.completeOAuth({
      code: request.query.code,
      state: request.query.state,
    });
    const url = new URL("/configuracion", service.config.appBaseUrl);
    url.searchParams.set("paymentAccount", result.status);
    response.redirect(302, url.toString());
  } catch (error) {
    logger.error("Mercado Pago OAuth callback failed", {
      errorType: error.code || error.name,
    });
    const baseUrl = safeAppBaseUrl();
    const url = new URL("/configuracion", baseUrl);
    url.searchParams.set("paymentAccount", "error");
    response.redirect(302, url.toString());
  }
}

async function mercadoPagoWebhook(request, response) {
  if (request.method !== "POST") {
    response.status(405).send("Method Not Allowed");
    return;
  }
  try {
    const service = createService();
    const dataId = request.query["data.id"] || request.body?.data?.id;
    await service.processWebhook({
      xSignature: request.get("x-signature"),
      xRequestId: request.get("x-request-id"),
      dataId,
      requestId: request.body?.id,
      body: request.body || {},
    });
    response.status(200).send("OK");
  } catch (error) {
    logger.error("Mercado Pago webhook failed", {
      errorType: error.code || error.name,
    });
    response.status(error.code === "INVALID_WEBHOOK" ? 401 : 500).send("Error");
  }
}

async function expirePendingBookingHolds() {
  return createService().expirePendingBookingHolds();
}

async function reconcilePayments() {
  return createService().reconcilePayments();
}

function safeAppBaseUrl() {
  try {
    return getPaymentConfig().appBaseUrl;
  } catch {
    return "http://localhost:5173";
  }
}

module.exports = {
  cancelBooking,
  createBookingHold,
  createBookingPayment,
  createMercadoPagoAuthorizationUrl,
  createPaymentAccountConnection,
  disconnectPaymentAccount,
  expireBookingHold,
  expirePendingBookingHolds,
  getBookingPaymentStatus,
  getPaymentAccountStatus,
  listMyPaymentBookings,
  mercadoPagoOAuthCallback,
  mercadoPagoWebhook,
  reconcilePayments,
  requestBookingRefund,
  simulatePaymentEvent,
  updatePsychologistPaymentSettings,
};
