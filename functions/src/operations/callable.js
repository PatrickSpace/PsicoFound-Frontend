/* eslint-disable max-len */
const {requestScope} = require("./telemetry");
const {randomUUID} = require("node:crypto");
const logger = require("firebase-functions/logger");
const {appCheckOptions} = require("./appCheckPolicy");
const firestoreAdmin = require("firebase-admin/firestore");
const {onCall: firebaseOnCall, HttpsError} = require("firebase-functions/v2/https");
const {recordAccountActivity} = require("../accounts/accountLifecycle");
const {recordOperationalAlert} = require("./operationalAlerts");
const PRIVACY_OPERATIONS = new Set(["diagnoseAccountDeletion", "authorizeAccountDeletion", "executeAccountDeletion"]);
function onCall(options, handler) {
  if (typeof options === "function") {
    handler = options; options = {};
  }
  return firebaseOnCall({...options, ...appCheckOptions()}, async (request) => {
    const correlationId = randomUUID();
    const startedAt = Date.now();
    try {
      // The product retains data and offers suspension. Legacy deletion tools
      // remain available only to isolated demo tests, never to production.
      if ((PRIVACY_OPERATIONS.has(handler.name) || handler.name === "requestAccountDeletion") &&
          !(process.env.FUNCTIONS_EMULATOR === "true" && /^demo-/.test(process.env.GCLOUD_PROJECT || ""))) {
        throw new HttpsError("failed-precondition", "La eliminación no está habilitada. Puedes suspender tu cuenta sin borrar información.");
      }
      if (!PRIVACY_OPERATIONS.has(handler.name)) {
        const maintenance = await firestoreAdmin.getFirestore().doc("runtime_controls/maintenance").get();
        if (maintenance.data()?.enabled === true) {
          throw new HttpsError("unavailable", "Mantenimiento en curso. Intenta más tarde; los recursos de ayuda siguen disponibles.");
        }
      }
      if (request.auth) {
        const user = await recordAccountActivity(request.auth.uid);
        if (user?.accountStatus === "suspended" &&
            !["getAccountAccessStatus", "suspendOwnAccount", "reactivateOwnAccount", "exportOwnData"].includes(handler.name)) {
          throw new HttpsError("permission-denied", "Tu cuenta está suspendida. Tus datos se conservan.", {reason: "account_suspended"});
        }
        const deletion = await firestoreAdmin.getFirestore().doc(`account_requests/${request.auth.uid}_deletion`).get();
        if (deletion.data()?.accessBlocked === true) throw new HttpsError("permission-denied", "Esta cuenta está cerrada o su eliminación está en curso.");
      }
      const result = await requestScope.run({correlationId}, () => handler(request));
      logger.info("callable completed", {operation: handler.name, correlationId, elapsedMs: Date.now() - startedAt});
      return result;
    } catch (error) {
      const known = error instanceof HttpsError;
      const code = known ? error.code : "internal";
      logger.warn("callable failed", {operation: handler.name, correlationId, elapsedMs: Date.now() - startedAt,
        code});
      try {
        await recordOperationalAlert({operation: handler.name, code,
          correlationId});
      } catch (alertError) {
        logger.error("operational alert persistence failed", {
          operation: handler.name, correlationId,
          code: typeof alertError?.code === "string" ? alertError.code : "internal",
        });
      }
      if (known) throw error;
      throw new HttpsError("internal", "No pudimos completar la operación. Intenta nuevamente.", {correlationId});
    }
  });
}
module.exports = {onCall};
