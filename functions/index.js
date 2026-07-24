const admin = require("firebase-admin");
const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall} = require("firebase-functions/v2/https");
const {GEMINI_API_KEY} = require("./src/config");
const {
  resetProfileChatConversation,
  sendProfileChatMessage,
} = require("./src/chat/profileChatHandlers");
const {
  getRecommendedTherapists,
} = require("./src/matching/recommendTherapists");
const {
  completePatientOnboarding,
  finalizeRegistration,
  reviewPsychologistApplication,
  submitPsychologistApplication,
} = require("./src/onboarding/registrationHandlers");

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
