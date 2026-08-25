const {HttpsError} = require("firebase-functions/v2/https");

function requireAppCheckIfEnabled(request) {
  const enabled = String(process.env.ENFORCE_APP_CHECK || "false")
      .toLowerCase() === "true";
  if (enabled && !request.app) {
    throw new HttpsError(
        "failed-precondition",
        "No pudimos verificar la integridad de esta aplicación.",
    );
  }
}

module.exports = {requireAppCheckIfEnabled};
