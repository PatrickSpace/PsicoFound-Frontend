const admin = require("firebase-admin");
const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall, onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {GEMINI_API_KEY} = require("./src/config");
const {
  CULQI_SECRET_KEY,
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
  CULQI_SECRET_KEY,
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
exports.getPaymentAccountStatus = onCall(
    paymentCallableOptions,
    paymentHandlers.getPaymentAccountStatus,
);
exports.updatePsychologistPaymentSettings = onCall(
    paymentCallableOptions,
    paymentHandlers.updatePsychologistPaymentSettings,
);
exports.savePsychologistPayoutAccount = onCall(
    paymentCallableOptions,
    paymentHandlers.savePsychologistPayoutAccount,
);
exports.listCulqiCards = onCall(
    paymentCallableOptions,
    paymentHandlers.listCulqiCards,
);
exports.saveCulqiCard = onCall(
    paymentCallableOptions,
    paymentHandlers.saveCulqiCard,
);
exports.completeCulqiCard3DS = onCall(
    paymentCallableOptions,
    paymentHandlers.completeCulqiCard3DS,
);
exports.removeCulqiCard = onCall(
    paymentCallableOptions,
    paymentHandlers.removeCulqiCard,
);
exports.completeCulqiPayment3DS = onCall(
    paymentCallableOptions,
    paymentHandlers.completeCulqiPayment3DS,
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
exports.culqiWebhook = onRequest(
    {timeoutSeconds: 30, secrets: paymentSecrets},
    paymentHandlers.culqiWebhook,
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

// Calendar and appointment operations do not depend on a payment provider.
const schedulingHandlers = require("./src/scheduling/schedulingHandlers");
for (const name of ["getTherapistCalendar", "projectAvailability",
  "listAvailability", "closeAvailability", "mutateAppointment",
  "cancelAppointment"]) {
  exports[name] = onCall({timeoutSeconds: 60}, schedulingHandlers[name]);
}
exports.sendAppointmentReminders = onSchedule(
    {schedule: "every 5 minutes", timeoutSeconds: 120},
    schedulingHandlers.sendAppointmentReminders,
);
