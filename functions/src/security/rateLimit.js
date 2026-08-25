const admin = require("firebase-admin");
const {HttpsError} = require("firebase-functions/v2/https");

const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

async function enforceRateLimit({
  db,
  uid,
  action,
  limit,
  windowMs,
}) {
  if (!uid || !action || !Number.isInteger(limit) || limit <= 0) {
    throw new HttpsError("internal", "Rate limit configuration is invalid.");
  }

  const windowStartedAt = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `${uid}:${action}:${windowStartedAt}`;
  const documentId = Buffer.from(key).toString("base64url");
  const reference = db.collection("rate_limits").doc(documentId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const currentCount = Number(snapshot.data()?.count || 0);

    if (currentCount >= limit) {
      throw new HttpsError(
          "resource-exhausted",
          [
            "Has realizado demasiados intentos.",
            "Espera un momento y vuelve a intentarlo.",
          ].join(" "),
      );
    }

    transaction.set(reference, {
      uid,
      action,
      windowStartedAt: Timestamp.fromMillis(windowStartedAt),
      expiresAt: Timestamp.fromMillis(windowStartedAt + windowMs * 2),
      count: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
  });
}

module.exports = {enforceRateLimit};
