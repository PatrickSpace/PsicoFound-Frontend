const admin = require("firebase-admin");
const {HttpsError} = require("firebase-functions/v2/https");
const {
  assertSameAmount,
  normalizePaymentRate,
  requireDocumentId,
  requireVersion,
} = require("./paymentRates");

function requireUid(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  }
  return request.auth.uid;
}

function hasRole(user = {}, role) {
  const aliases = role === "admin" ?
    ["admin", "psicofound-admin"] :
    ["psychologist", "psicologo", "psicólogo", "psicóloga"];
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return [...roles, user.rol, user.role].some((value) =>
    typeof value === "string" && aliases.includes(value.toLowerCase().trim()),
  );
}

async function savePaymentRate(request) {
  const uid = requireUid(request);
  const data = request.data || {};
  const rateId = requireDocumentId(data.rateId);
  const expectedVersion = requireVersion(data.expectedVersion);
  const rate = normalizePaymentRate(data);
  const db = admin.firestore();
  const rateRef = db.collection("payment_rates").doc(rateId);

  return db.runTransaction(async (transaction) => {
    const user = await transaction.get(db.collection("users").doc(uid));
    if (!hasRole(user.data(), "admin")) {
      throw new HttpsError("permission-denied", "Necesitas permisos de admin.");
    }
    const snapshot = await transaction.get(rateRef);
    const existing = snapshot.data();
    const currentVersion = existing ? existing.version : 0;
    const sameValues = existing && Object.keys(rate).every((key) =>
      existing[key] === rate[key],
    );

    // A retried save with the same ID/payload must not create another version.
    if (sameValues && (currentVersion === expectedVersion ||
        currentVersion === expectedVersion + 1)) {
      return {rateId, version: currentVersion};
    }
    if (currentVersion !== expectedVersion) {
      throw new HttpsError(
          "aborted",
          "La tarifa cambio. Actualiza el catalogo e intenta de nuevo.",
      );
    }
    if (existing) assertSameAmount(existing, rate);
    const version = currentVersion + 1;
    const now = admin.firestore.FieldValue.serverTimestamp();
    const payload = {
      ...rate,
      version,
      updatedAt: now,
      updatedBy: uid,
      createdAt: existing ? existing.createdAt : now,
      createdBy: existing ? existing.createdBy : uid,
    };
    transaction.set(rateRef, payload);
    transaction.create(rateRef.collection("versions").doc(String(version)), {
      ...rate,
      version,
      changedAt: now,
      changedBy: uid,
    });
    return {rateId, version};
  });
}

async function setPsychologistPaymentRate(request) {
  const uid = requireUid(request);
  const data = request.data || {};
  const therapistId = requireDocumentId(data.therapistId);
  const rateId = requireDocumentId(data.rateId);
  const expectedRateVersion = requireVersion(data.expectedRateVersion);
  const expectedSelectionVersion =
    requireVersion(data.expectedSelectionVersion);
  const db = admin.firestore();
  const therapistRef = db.collection("therapists").doc(therapistId);
  const rateRef = db.collection("payment_rates").doc(rateId);

  return db.runTransaction(async (transaction) => {
    const user = await transaction.get(db.collection("users").doc(uid));
    const therapistSnapshot = await transaction.get(therapistRef);
    const therapist = therapistSnapshot.data();
    if (!hasRole(user.data(), "psychologist") || !therapist ||
        therapist.uid !== uid || therapist.activo === false) {
      throw new HttpsError(
          "permission-denied",
          "Solo puedes cambiar tu propia tarifa profesional.",
      );
    }
    const snapshot = await transaction.get(rateRef);
    const rate = snapshot.data();
    if (!rate || rate.active !== true) {
      throw new HttpsError(
          "failed-precondition",
          "Esta tarifa ya no esta disponible. Elige otra.",
      );
    }
    if (rate.version !== expectedRateVersion) {
      throw new HttpsError(
          "aborted",
          "La tarifa cambio. Revisa sus condiciones antes de guardar.",
      );
    }
    const currentVersion = therapist.paymentRateSelectionVersion || 0;
    if (therapist.paymentRateId === rateId &&
        (currentVersion === expectedSelectionVersion ||
         currentVersion === expectedSelectionVersion + 1)) {
      return {rateId, selectionVersion: currentVersion};
    }
    if (currentVersion !== expectedSelectionVersion) {
      throw new HttpsError(
          "aborted",
          "Tu tarifa cambio en otra ventana. Actualiza e intenta de nuevo.",
      );
    }
    const selectionVersion = currentVersion + 1;
    const now = admin.firestore.FieldValue.serverTimestamp();
    // Changing the booking configuration never writes existing appointments.
    transaction.update(therapistRef, {
      paymentRateId: rateId,
      paymentRateSelectionVersion: selectionVersion,
      paymentRateUpdatedAt: now,
    });
    transaction.create(
        therapistRef.collection("rate_history").doc(String(selectionVersion)),
        {
          previousRateId: therapist.paymentRateId || null,
          rateId,
          rateVersion: rate.version,
          selectionVersion,
          amountMinor: rate.amountMinor,
          currency: rate.currency,
          platformPercent: rate.platformPercent,
          psychologistPercent: rate.psychologistPercent,
          changedAt: now,
          changedBy: uid,
        },
    );
    return {rateId, selectionVersion};
  });
}

module.exports = {savePaymentRate, setPsychologistPaymentRate};
