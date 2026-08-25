const admin = require("firebase-admin");
const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall, onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {GEMINI_API_KEY} = require("./src/config");
const {
  MERCADO_PAGO_ACCESS_TOKEN,
  MERCADO_PAGO_CLIENT_SECRET,
  MERCADO_PAGO_WEBHOOK_SECRET,
  PAYMENT_TOKEN_ENCRYPTION_KEY,
} = require("./src/payments/config/paymentConfig");
const {
  resetProfileChatConversation,
  sendProfileChatMessage,
} = require("./src/chat/profileChatHandlers");
const {
  getRecommendedTherapists,
} = require("./src/matching/recommendTherapists");
const {
  createTherapyFromProfile,
} = require("./src/therapies/therapyHandlers");
const {
  completePatientOnboarding,
  finalizeRegistration,
  reviewPsychologistApplication,
  submitPsychologistApplication,
} = require("./src/onboarding/registrationHandlers");
const paymentHandlers = require("./src/payments/paymentHandlers");
const adminHandlers = require("./src/admin/adminHandlers");

admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
  region: "southamerica-east1",
});

exports.sendProfileChatMessage = onCall(
    {
      minInstances: 0,
      secrets: [GEMINI_API_KEY],
      timeoutSeconds: 60,
    },
    sendProfileChatMessage,
);

exports.resetProfileChatConversation = onCall(
    {
      minInstances: 0,
      timeoutSeconds: 20,
    },
    resetProfileChatConversation,
);

exports.getRecommendedTherapists = onCall(
    {
      minInstances: 0,
      timeoutSeconds: 20,
    },
    getRecommendedTherapists,
);

exports.createTherapyFromProfile = onCall(
    {
      minInstances: 0,
      timeoutSeconds: 20,
    },
    createTherapyFromProfile,
);

exports.finalizeRegistration = onCall(
    {
      minInstances: 0,
      timeoutSeconds: 20,
    },
    finalizeRegistration,
);

exports.completePatientOnboarding = onCall(
    {
      minInstances: 0,
      timeoutSeconds: 20,
    },
    completePatientOnboarding,
);

exports.submitPsychologistApplication = onCall(
    {
      minInstances: 0,
      timeoutSeconds: 20,
    },
    submitPsychologistApplication,
);

exports.reviewPsychologistApplication = onCall(
    {
      minInstances: 0,
      timeoutSeconds: 30,
    },
    reviewPsychologistApplication,
);

exports.upsertUserByAdmin = onCall(
    {minInstances: 0, timeoutSeconds: 30},
    adminHandlers.upsertUserByAdmin,
);

exports.setUserAccountStatusByAdmin = onCall(
    {minInstances: 0, timeoutSeconds: 30},
    adminHandlers.setUserAccountStatusByAdmin,
);

exports.seedQaMarketplaceData = onCall(
    {minInstances: 0, timeoutSeconds: 120},
    adminHandlers.seedQaMarketplaceData,
);

const paymentSecrets = [
  MERCADO_PAGO_ACCESS_TOKEN,
  MERCADO_PAGO_CLIENT_SECRET,
  MERCADO_PAGO_WEBHOOK_SECRET,
  PAYMENT_TOKEN_ENCRYPTION_KEY,
];
const paymentCallableOptions = {
  minInstances: 0,
  timeoutSeconds: 60,
  secrets: paymentSecrets,
};

exports.createPaymentAccountConnection = onCall(
    paymentCallableOptions,
    paymentHandlers.createPaymentAccountConnection,
);
exports.createMercadoPagoAuthorizationUrl = onCall(
    paymentCallableOptions,
    paymentHandlers.createMercadoPagoAuthorizationUrl,
);
exports.getPaymentAccountStatus = onCall(
    paymentCallableOptions,
    paymentHandlers.getPaymentAccountStatus,
);
exports.updatePsychologistPaymentSettings = onCall(
    paymentCallableOptions,
    paymentHandlers.updatePsychologistPaymentSettings,
);
exports.disconnectPaymentAccount = onCall(
    paymentCallableOptions,
    paymentHandlers.disconnectPaymentAccount,
);
exports.createBookingHold = onCall(
    paymentCallableOptions,
    paymentHandlers.createBookingHold,
);
exports.createBookingPayment = onCall(
    paymentCallableOptions,
    paymentHandlers.createBookingPayment,
);
exports.getBookingPaymentStatus = onCall(
    paymentCallableOptions,
    paymentHandlers.getBookingPaymentStatus,
);
exports.listMyPaymentBookings = onCall(
    paymentCallableOptions,
    paymentHandlers.listMyPaymentBookings,
);
exports.expireBookingHold = onCall(
    paymentCallableOptions,
    paymentHandlers.expireBookingHold,
);
exports.cancelBooking = onCall(
    paymentCallableOptions,
    paymentHandlers.cancelBooking,
);
exports.requestBookingRefund = onCall(
    paymentCallableOptions,
    paymentHandlers.requestBookingRefund,
);
exports.refundBookingPayment = onCall(
    paymentCallableOptions,
    paymentHandlers.requestBookingRefund,
);
exports.simulatePaymentEvent = onCall(
    paymentCallableOptions,
    paymentHandlers.simulatePaymentEvent,
);
exports.mercadoPagoOAuthCallback = onRequest(
    {timeoutSeconds: 60, secrets: paymentSecrets},
    paymentHandlers.mercadoPagoOAuthCallback,
);
exports.mercadoPagoWebhook = onRequest(
    {timeoutSeconds: 30, secrets: paymentSecrets},
    paymentHandlers.mercadoPagoWebhook,
);
exports.expirePendingBookingHolds = onSchedule(
    {schedule: "every 1 minutes", timeoutSeconds: 60, secrets: paymentSecrets},
    paymentHandlers.expirePendingBookingHolds,
);
exports.reconcilePayments = onSchedule(
    {
      schedule: "every 30 minutes",
      timeoutSeconds: 300,
      secrets: paymentSecrets,
    },
    paymentHandlers.reconcilePayments,
);
