const {HttpsError} = require("firebase-functions/v2/https");
const MAX_SURVEY_ATTEMPTS = 10;

function surveyAttemptCount(conversation = {}, newAttempt = false) {
  const count = conversation.surveyAttemptCount ??
    (conversation.activeSessionId ? 1 : 0);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new HttpsError("failed-precondition",
        "No pudimos verificar los intentos de encuesta. Contacta con soporte.");
  }
  if (newAttempt && count >= MAX_SURVEY_ATTEMPTS) {
    throw new HttpsError("resource-exhausted",
        "Alcanzaste el máximo de 10 encuestas. Puedes continuar la encuesta " +
        "actual, revisar tus preferencias y reservar.",
        {reason: "survey_attempts_exhausted"});
  }
  return count + (newAttempt ? 1 : 0);
}
module.exports = {surveyAttemptCount, MAX_SURVEY_ATTEMPTS};
