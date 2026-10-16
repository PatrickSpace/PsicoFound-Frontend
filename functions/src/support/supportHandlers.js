/* eslint-disable max-len */
const firestoreAdmin = require("firebase-admin/firestore");
const {FieldValue} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");

const CATEGORIES = new Set(["error", "sugerencia", "comentario"]);
const {requireAdmin} = require("../accounts/adminHandlers");
const {createHash} = require("node:crypto");
const STATUSES = new Set(["open", "in_progress", "resolved"]);

function cleanText(value, max, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if ((required && !result) || result.length > max) {
    throw new HttpsError("invalid-argument", "Revisa los datos ingresados.");
  }
  return result;
}

function requestId(value) {
  const result = cleanText(value, 100, true);
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(result)) {
    throw new HttpsError("invalid-argument", "La solicitud no es válida.");
  }
  return result;
}

async function createSupportRequest(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const data = request.data || {};
  const category = cleanText(data.category, 30, true).toLowerCase();
  const message = cleanText(data.message, 1200, true);
  const operationId = requestId(data.requestId);
  if (!CATEGORIES.has(category)) {
    throw new HttpsError("invalid-argument", "Selecciona un tipo válido.");
  }
  const db = firestoreAdmin.getFirestore();
  const userSnapshot = await db.doc(`users/${request.auth.uid}`).get();
  const user = userSnapshot.data() || {};
  const ref = db.doc(`support_requests/${request.auth.uid}_${operationId}`);
  const paymentOperationId = cleanText(data.paymentOperationId, 128);
  if (paymentOperationId && !/^[A-Za-z0-9_-]+$/.test(paymentOperationId)) {
    throw new HttpsError("invalid-argument", "La operación de pago no es válida.");
  }
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) {
      const saved = existing.data();
      if (saved.category !== category || saved.message !== message ||
          (saved.paymentOperationId || "") !== paymentOperationId) {
        throw new HttpsError("already-exists", "Usa otra solicitud para datos distintos.");
      }
      return {id: ref.id, status: saved.status, category: saved.category};
    }
    let payment = null;
    if (paymentOperationId) {
      payment = (await transaction.get(db.doc(`payment_operations/${paymentOperationId}`))).data();
      if (!payment || payment.patientUid !== request.auth.uid) {
        throw new HttpsError("permission-denied", "La operación no te pertenece.");
      }
    }
    transaction.create(ref, {
      requesterUid: request.auth.uid,
      requesterName: user.nombre || request.auth.token.name || "Usuario",
      requesterEmail: request.auth.token.email || user.email || "",
      category,
      message,
      ...(payment ? {paymentOperationId, paymentReference: payment.reference || paymentOperationId} : {}),
      status: "open",
      responses: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return {id: ref.id, status: "open", category};
  });
}

async function respondSupportRequest(request) {
  const data = request.data || {};
  const supportRequestId = cleanText(data.supportRequestId, 220, true);
  const status = cleanText(data.status, 30, true).toLowerCase();
  const response = cleanText(data.response, 1200, status === "resolved");
  if (!STATUSES.has(status)) {
    throw new HttpsError("invalid-argument", "Selecciona un estado válido.");
  }
  if (supportRequestId.includes("/")) throw new HttpsError("invalid-argument", "Solicitud inválida.");
  const db = firestoreAdmin.getFirestore();
  const ref = db.doc(`support_requests/${supportRequestId}`);
  const actionId = requestId(data.requestId);
  const hash = createHash("sha256").update(JSON.stringify({status, response, version: data.expectedVersion})).digest("hex");
  return db.runTransaction(async (transaction) => {
    await requireAdmin(transaction, db, request.auth);
    const current = (await transaction.get(ref)).data();
    if (!current) throw new HttpsError("not-found", "La solicitud no existe.");
    const previous = (current.responses || []).find((entry) => entry.requestId === actionId);
    if (previous) {
      if (previous.hash !== hash || previous.authorUid !== request.auth.uid) throw new HttpsError("already-exists", "Reintento con datos diferentes.");
      return {id: supportRequestId, status: current.status};
    }
    if (!Number.isSafeInteger(data.expectedVersion) || data.expectedVersion !== (current.version || 0)) throw new HttpsError("aborted", "Otra persona actualizó la solicitud. Cierra y vuelve a revisar.");
    const transitions = {open: ["in_progress", "resolved"], in_progress: ["in_progress", "resolved"], resolved: ["in_progress"]};
    if (!(transitions[current.status] || []).includes(status) || !response) throw new HttpsError("failed-precondition", "Escribe una respuesta y selecciona una transición válida; una resuelta puede reabrirse.");
    const version = (current.version || 0) + 1;
    const now = FieldValue.serverTimestamp();
    transaction.update(ref, {
      status, version,
      responses: [...(current.responses || []), {message: response, authorUid: request.auth.uid, createdAt: new Date().toISOString(), status, requestId: actionId, hash}],
      updatedBy: request.auth.uid, updatedAt: now,
    });
    transaction.create(db.doc(`notifications/support_${supportRequestId}_${version}`), {
      recipientUid: current.requesterUid, actorUid: request.auth.uid,
      type: "support_updated", title: "Tu solicitud de soporte fue actualizada",
      message: response, route: "/configuracion?support=1", readAt: null,
      metadata: {supportRequestId, status}, createdAt: now,
    });
    return {id: supportRequestId, status, version};
  });
}

module.exports = {
  createSupportRequest,
  respondSupportRequest,
};
