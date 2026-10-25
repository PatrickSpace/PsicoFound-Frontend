const firestoreAdmin = require("firebase-admin/firestore");
const {FieldValue} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {requireAdmin, audit} = require("../accounts/adminHandlers");

const ALERT_CODES = new Set(["internal", "resource-exhausted", "unavailable"]);

function cleanIdentifier(value, fallback = "unknown") {
  const result = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9_-]{1,100}$/.test(result) ? result : fallback;
}

function shouldRecordOperationalAlert(code) {
  return ALERT_CODES.has(code);
}

function severityFor(code) {
  return code === "internal" ? "critical" : "warning";
}

async function recordOperationalAlert({operation, code, correlationId}) {
  if (!shouldRecordOperationalAlert(code)) return;
  const db = firestoreAdmin.getFirestore();
  const safeOperation = cleanIdentifier(operation);
  const safeCode = cleanIdentifier(code);
  const hour = new Date().toISOString().slice(0, 13).replace(/[-T]/g, "_");
  const ref = db.doc(`operational_alerts/${safeOperation}_${safeCode}_${hour}`);
  await db.runTransaction(async (transaction) => {
    const current = (await transaction.get(ref)).data();
    const now = FieldValue.serverTimestamp();
    transaction.set(ref, {
      operation: safeOperation,
      code: safeCode,
      severity: severityFor(safeCode),
      status: current?.status === "acknowledged" ? "reopened" : "open",
      occurrenceCount: Number(current?.occurrenceCount || 0) + 1,
      notificationEmail: process.env.OPERATIONAL_ALERT_EMAIL || "",
      notificationChannel: "cloud-monitoring-email",
      firstOccurredAt: current?.firstOccurredAt || now,
      lastOccurredAt: now,
      lastCorrelationId: cleanIdentifier(correlationId, "not-available"),
      acknowledgedAt: FieldValue.delete(),
      acknowledgedBy: FieldValue.delete(),
      acknowledgementNote: FieldValue.delete(),
    }, {merge: true});
  });
}

async function acknowledgeOperationalAlert(request) {
  const data = request.data || {};
  const alertId = cleanIdentifier(data.alertId, "");
  const note = typeof data.note === "string" ? data.note.trim() : "";
  if (!alertId || note.length > 500) {
    throw new HttpsError("invalid-argument", "Revisa la alerta y la nota.");
  }
  const db = firestoreAdmin.getFirestore();
  return db.runTransaction(async (transaction) => {
    await requireAdmin(transaction, db, request.auth);
    const ref = db.doc(`operational_alerts/${alertId}`);
    const current = (await transaction.get(ref)).data();
    if (!current) throw new HttpsError("not-found", "La alerta no existe.");
    const now = FieldValue.serverTimestamp();
    transaction.update(ref, {
      status: "acknowledged",
      acknowledgedAt: now,
      acknowledgedBy: request.auth.uid,
      acknowledgementNote: note,
    });
    audit(transaction, db, request.auth.uid, alertId,
        "operational_alert_acknowledged", {
          operation: current.operation || "unknown",
          code: current.code || "unknown",
        });
    return {alertId, status: "acknowledged"};
  });
}

module.exports = {
  acknowledgeOperationalAlert,
  recordOperationalAlert,
  shouldRecordOperationalAlert,
};
