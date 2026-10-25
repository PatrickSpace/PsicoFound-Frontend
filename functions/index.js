const admin = require("firebase-admin");
const {
  getTherapySharedHistory, getTherapySharedSummary,
  createFollowupGoal, recordGoalProgress,
  assignFollowupExercise, completeFollowupExercise, createEmotionalCheckin,
} = require("./src/therapy/followupHandlers");
const {
  changeAppointmentStatus,
  changeTherapyStatus,
  manageAvailability,
  reserveAppointment,
  rescheduleAppointment,
  updateAppointmentDetails,
} = require("./src/appointments/appointmentHandlers");
const {
  exportOwnData,
  requestAccountDeletion,
  updateOwnProfile,
  getAccountAccessStatus,
  acceptCurrentConsent,
  syncOwnAuthEmail,
} = require("./src/accounts/accountHandlers");
const {
  createSupportRequest,
  respondSupportRequest,
} = require("./src/support/supportHandlers");
const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall} = require("./src/operations/callable");
const {
  diagnoseAccountDeletion, authorizeAccountDeletion, executeAccountDeletion,
} = require("./src/accounts/privacyHandlers");
const {
  resetProfileChatConversation,
  confirmProfileSummary,
  startProfileChatConversation,
  sendProfileChatMessage,
  updateProfilePreferences,
} = require("./src/chat/profileChatHandlers");
const {OPENAI_API_KEY} = require("./src/config");
const {
  getRecommendedTherapists,
} = require("./src/matching/recommendTherapists");
const {
  savePaymentRate,
  setPsychologistPaymentRate,
} = require("./src/payments/paymentRateHandlers");
const {
  getBookingQuote,
  markPaymentSubmitted,
  requestPaymentRefundReview,
  reviewPaymentOperation,
  expirePaymentReservation, recordProfessionalTransfer,
} = require("./src/payments/paymentOperationHandlers");
const {
  completePatientOnboarding,
  finalizeRegistration,
  reviewPsychologistApplication,
  submitPsychologistApplication,
} = require("./src/onboarding/registrationHandlers");
const {
  acknowledgeOperationalAlert,
} = require("./src/operations/operationalAlerts");

admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
  region: "southamerica-east1",
});

exports.sendProfileChatMessage = onCall(
    {
      minInstances: 0,
      secrets: [OPENAI_API_KEY],
      timeoutSeconds: 60,
    },
    sendProfileChatMessage,
);

exports.startProfileChatConversation = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    startProfileChatConversation,
);

exports.resetProfileChatConversation = onCall(
    {
      minInstances: 0,
      timeoutSeconds: 20,
    },
    resetProfileChatConversation,
);

exports.updateProfilePreferences = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    updateProfilePreferences,
);

exports.confirmProfileSummary = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    confirmProfileSummary,
);

exports.getRecommendedTherapists = onCall(
    {
      minInstances: 0,
      timeoutSeconds: 20,
    },
    getRecommendedTherapists,
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

exports.savePaymentRate = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    savePaymentRate,
);

exports.setPsychologistPaymentRate = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    setPsychologistPaymentRate,
);
exports.getBookingQuote = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    getBookingQuote,
);
exports.markPaymentSubmitted = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    markPaymentSubmitted,
);
exports.requestPaymentRefundReview = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    requestPaymentRefundReview,
);
exports.reviewPaymentOperation = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    reviewPaymentOperation,
);
exports.acknowledgeOperationalAlert = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    acknowledgeOperationalAlert,
);

exports.manageAvailability = onCall(manageAvailability);
exports.getTherapySharedSummary = onCall(getTherapySharedSummary);
exports.getTherapySharedHistory = onCall(getTherapySharedHistory);
exports.createFollowupGoal = onCall(createFollowupGoal);
exports.recordGoalProgress = onCall(recordGoalProgress);
exports.assignFollowupExercise = onCall(assignFollowupExercise);
exports.completeFollowupExercise = onCall(completeFollowupExercise);
exports.createEmotionalCheckin = onCall(createEmotionalCheckin);
exports.reserveAppointment = onCall(
    {minInstances: 0, timeoutSeconds: 30},
    reserveAppointment,
);
exports.rescheduleAppointment = onCall(
    {minInstances: 0, timeoutSeconds: 30},
    rescheduleAppointment,
);
exports.changeAppointmentStatus = onCall(
    {minInstances: 0, timeoutSeconds: 30},
    changeAppointmentStatus,
);
exports.updateAppointmentDetails = onCall(
    {minInstances: 0, timeoutSeconds: 30},
    updateAppointmentDetails,
);
exports.changeTherapyStatus = onCall(
    {minInstances: 0, timeoutSeconds: 30},
    changeTherapyStatus,
);
exports.updateOwnProfile = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    updateOwnProfile,
);
exports.getAccountAccessStatus = onCall(getAccountAccessStatus);
exports.acceptCurrentConsent = onCall(acceptCurrentConsent);
exports.syncOwnAuthEmail = onCall(syncOwnAuthEmail);
exports.exportOwnData = onCall(
    {minInstances: 0, timeoutSeconds: 30},
    exportOwnData,
);
exports.requestAccountDeletion = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    requestAccountDeletion,
);
exports.createSupportRequest = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    createSupportRequest,
);
exports.respondSupportRequest = onCall(
    {minInstances: 0, timeoutSeconds: 20},
    respondSupportRequest,
);

exports.diagnoseAccountDeletion = onCall(diagnoseAccountDeletion);
exports.authorizeAccountDeletion = onCall(authorizeAccountDeletion);
exports.executeAccountDeletion = onCall(
    {timeoutSeconds: 120}, executeAccountDeletion,
);

exports.expirePaymentReservation = onCall(expirePaymentReservation);
exports.recordProfessionalTransfer = onCall(recordProfessionalTransfer);

const {
  updateUserByAdmin, updateProfessionalByAdmin,
  getAdministrativeAccountRequests, getPaymentOperationContext,
} = require("./src/accounts/adminHandlers");
exports.updateUserByAdmin = onCall(updateUserByAdmin);
exports.updateProfessionalByAdmin = onCall(updateProfessionalByAdmin);
exports.getAdministrativeAccountRequests =
  onCall(getAdministrativeAccountRequests);
exports.getPaymentOperationContext = onCall(getPaymentOperationContext);

const {
  saveLegalDraft, publishLegalDraft,
} = require("./src/accounts/legalHandlers");
exports.saveLegalDraft = onCall(
    {minInstances: 0, timeoutSeconds: 30}, saveLegalDraft,
);
exports.publishLegalDraft = onCall(
    {minInstances: 0, timeoutSeconds: 30}, publishLegalDraft,
);
