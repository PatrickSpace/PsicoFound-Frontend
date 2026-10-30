/* eslint-disable max-len */
const {requirePatientAccess} = require("../accounts/accessPolicy");
const {assertReceptionAllowed, commercialRateReady, usableSlots} = require("../onboarding/professionalSetup");
const {assertFutureSlot} = require("../appointments/appointmentDomain");
const {wallParts, DEFAULT_TIME_ZONE} = require("../appointments/schedulePolicy.mjs");
const firestoreAdmin = require("firebase-admin/firestore");
const {commercialPolicy, snapshotPolicy, fingerprint, obligationAmounts} = require("./commercialPolicy");
const {isOpenAppointment, replaceAppointmentSummary} = require("../appointments/appointmentDomain");
const {FieldValue} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {requireDocumentId} = require("./paymentRates");

function requireAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  return request.auth;
}

function roles(user = {}) {
  return [...(Array.isArray(user.roles) ? user.roles : []), user.rol, user.role]
      .filter(Boolean).map((item) => item.toString().trim().toLowerCase());
}

function isAdmin(user) {
  return roles(user).some((item) => ["admin", "psicofound-admin"].includes(item));
}

function cleanText(value, max = 600, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if ((required && !result) || result.length > max) {
    throw new HttpsError("invalid-argument", "Revisa los datos ingresados.");
  }
  return result;
}

function quoteFromRate(therapistId, therapist, rateId, rate, policy = commercialPolicy()) {
  if (rate.isTest && policy.status !== "synthetic") {
    throw new HttpsError("failed-precondition", "Las tarifas de prueba no están disponibles para reservas comerciales.");
  }
  return {
    quoteId: fingerprint({therapistId, rateId, rate, selectionVersion: therapist.paymentRateSelectionVersion || 0, policy}),
    commercialPolicy: policy,
    therapistId,
    rateId,
    rateVersion: rate.version,
    selectionVersion: therapist.paymentRateSelectionVersion || 0,
    name: rate.name,
    amountMinor: rate.amountMinor,
    currency: rate.currency,
    paymentUrl: rate.paymentUrl,
    isTest: Boolean(rate.isTest),
    platformPercent: rate.platformPercent,
    psychologistPercent: rate.psychologistPercent,
    reconciliation: "manual",
    provider: "mercado_pago",
    conditions: {
      providerReceiptIsNotFiscalDocument: true,
      openingLinkDoesNotConfirmPayment: true,
      refundRequiresAdministrativeReview: true,
      expirationPolicyConfigured: true,
      holdMinutes: policy.holdMinutes,
      submittedExpiration: policy.submittedExpiration,
      patientCancellationCutoffMinutes: policy.patientCancellationCutoffMinutes,
      patientRescheduleCutoffMinutes: policy.patientRescheduleCutoffMinutes,
    },
  };
}

const PAYMENT_TRANSITIONS = Object.freeze({
  pending: ["rejected"],
  submitted: ["confirmed", "rejected"],
  refund_review: ["refunded", "confirmed"],
});

function assertPaymentTransition(currentStatus, nextStatus) {
  if (!(PAYMENT_TRANSITIONS[currentStatus] || []).includes(nextStatus)) {
    throw new HttpsError(
        "failed-precondition",
        "Ese cambio de estado no está permitido.",
    );
  }
  return nextStatus;
}

async function loadAppointmentContext(transaction, db, operation) {
  if (!operation.appointmentId) return null;
  const appointmentRef = db.doc(`citas/${operation.appointmentId}`);
  const appointmentSnapshot = await transaction.get(appointmentRef);
  if (!appointmentSnapshot.exists) return null;
  const appointment = appointmentSnapshot.data();
  if (!appointment.terapiaId) return {appointmentRef, appointment, therapyRef: null, therapy: null};
  const therapyRef = db.doc(`terapias/${appointment.terapiaId}`);
  const therapySnapshot = await transaction.get(therapyRef);
  return {
    appointmentRef,
    appointment,
    therapyRef,
    therapy: therapySnapshot.exists ? therapySnapshot.data() : null,
  };
}

function syncAppointmentPaymentStatus(transaction, context, nextStatus, now) {
  if (!context) return;
  transaction.update(context.appointmentRef, {
    paymentStatus: nextStatus,
    updatedAt: now,
  });
  if (!context.therapyRef || !context.therapy) return;
  const citas = Array.isArray(context.therapy.citas) ? context.therapy.citas : [];
  transaction.update(context.therapyRef, {
    citas: citas.map((item) =>
      (item.citaId || item.id) === context.appointmentRef.id ?
        {...item, paymentStatus: nextStatus} : item),
    updatedAt: now,
  });
}

async function getBookingQuote(request) {
  await requirePatientAccess(request);
  const therapistId = requireDocumentId(request.data && request.data.therapistId);
  const db = firestoreAdmin.getFirestore();
  const therapist = (await db.doc(`therapists/${therapistId}`).get()).data();
  assertReceptionAllowed(therapist);
  if (!therapist || therapist.activo === false || !therapist.paymentRateId) {
    throw new HttpsError(
        "failed-precondition",
        "El profesional todavía no tiene una tarifa activa para reservar.",
    );
  }
  const rateId = requireDocumentId(therapist.paymentRateId);
  const rate = (await db.doc(`payment_rates/${rateId}`).get()).data();
  if (!rate || rate.active !== true) {
    throw new HttpsError(
        "failed-precondition",
        "La tarifa dejó de estar disponible. Solicita una nueva cotización.",
    );
  }
  const quote = quoteFromRate(therapistId, therapist, rateId, rate);
  if (therapist.setupVersion === 1) {
    const owner = (await db.doc(`users/${therapist.uid}`).get()).data();
    if (!owner || owner.accountStatus === "suspended" || !commercialRateReady(rate)) {
      throw new HttpsError("failed-precondition", "El profesional necesita actualizar su tarifa o disponibilidad.");
    }
    if (!request.data.availabilitySlotId) {
      const slots = await db.collection("therapist_availability").where("therapistId", "==", therapistId).get();
      if (!usableSlots(therapist, slots.docs.map((item) => item.data())).length) throw new HttpsError("failed-precondition", "El profesional necesita abrir nuevos horarios.");
    }
  }
  if (request.data.availabilitySlotId) {
    const id = requireDocumentId(request.data.availabilitySlotId);
    const slot = (await db.doc(`therapist_availability/${id}`).get()).data();
    if (!slot || slot.status !== "available" || slot.therapistId !== therapistId) {
      throw new HttpsError("failed-precondition", "El horario ya no está disponible.");
    }
    if (therapist.setupVersion === 1 && !usableSlots(therapist, [slot]).length) {
      throw new HttpsError("failed-precondition", "El horario no corresponde a la modalidad disponible.");
    }
    try {
      const {start} = assertFutureSlot(slot);
      quote.schedule = {...wallParts(start), timeZone: DEFAULT_TIME_ZONE, startAtIso: start.toISOString()};
    } catch (error) {
      throw new HttpsError("failed-precondition", error.message);
    }
  }
  return quote;
}

async function markPaymentSubmitted(request) {
  const auth = requireAuth(request);
  const operationId = requireDocumentId(request.data && request.data.operationId);
  const db = firestoreAdmin.getFirestore();
  const ref = db.doc(`payment_operations/${operationId}`);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const operation = snapshot.data();
    if (!operation || operation.patientUid !== auth.uid) {
      throw new HttpsError("permission-denied", "La operación no te pertenece.");
    }
    if (operation.status === "submitted") return {operationId, status: "submitted"};
    if (operation.status !== "pending") {
      throw new HttpsError("failed-precondition", "La operación ya no admite este cambio.");
    }
    snapshotPolicy(operation.rateSnapshot?.commercialPolicy);
    const deadline = typeof operation.expiresAt?.toMillis === "function" ? operation.expiresAt.toMillis() : NaN;
    if (!Number.isFinite(deadline) || deadline <= Date.now()) {
      throw new HttpsError("failed-precondition", "El plazo de pago terminó. Solicita revisión si ya pagaste.");
    }
    const appointmentContext = await loadAppointmentContext(transaction, db, operation);
    const now = FieldValue.serverTimestamp();
    transaction.update(ref, {
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    });
    syncAppointmentPaymentStatus(transaction, appointmentContext, "submitted", now);
    return {operationId, status: "submitted"};
  });
}

async function requestPaymentRefundReview(request) {
  const auth = requireAuth(request);
  const data = request.data || {};
  const operationId = requireDocumentId(data.operationId);
  const reason = cleanText(data.reason, 600, true);
  const db = firestoreAdmin.getFirestore();
  const ref = db.doc(`payment_operations/${operationId}`);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const operation = snapshot.data();
    if (!operation || operation.patientUid !== auth.uid) {
      throw new HttpsError("permission-denied", "La operación no te pertenece.");
    }
    if (operation.status === "refund_review") {
      return {operationId, status: "refund_review"};
    }
    if (operation.status !== "confirmed") {
      throw new HttpsError(
          "failed-precondition",
          "Solo un pago confirmado puede enviarse a revisión de devolución.",
      );
    }
    const appointmentContext = await loadAppointmentContext(transaction, db, operation);
    const now = FieldValue.serverTimestamp();
    transaction.update(ref, {
      status: "refund_review",
      refundReason: reason,
      refundRequestedAt: now,
      updatedAt: now,
    });
    syncAppointmentPaymentStatus(transaction, appointmentContext, "refund_review", now);
    return {operationId, status: "refund_review"};
  });
}

async function requireOperator(db, auth, transaction) {
  const ref = db.doc(`users/${auth.uid}`);
  const user = (transaction ? await transaction.get(ref) : await ref.get()).data() || {};
  if (!isAdmin(user)) throw new HttpsError("permission-denied", "Acceso solo para conciliación autorizada.");
}
function receiptRef(db, policy, kind, reference) {
  return db.doc(`payment_receipts/${fingerprint({provider: "mercado_pago", merchant: policy.merchantAccount, kind, reference})}`);
}
function paymentEvent(transaction, db, operationId, operation, status, actorUid, now) {
  const id = `payment_${operationId}_${status}`;
  transaction.set(db.doc(`longitudinal_history/${id}`), {
    pacienteUid: operation.patientUid, terapeutaId: operation.therapistId,
    terapiaId: operation.therapyId, sourceId: operationId, sourceType: "payment",
    eventType: `payment_${status}`, title: "Estado de pago actualizado",
    summary: "Actualización de conciliación manual.", visibility: "patient",
    createdBy: actorUid, occurredAt: new Date().toISOString(), createdAt: now,
    metadata: {paymentOperationId: operationId, status},
  });
  transaction.set(db.doc(`notifications/${id}`), {
    recipientUid: operation.patientUid, actorUid, type: `payment_${status}`,
    title: "Estado de pago actualizado", message: "Consulta el estado de tu reserva y pago.",
    route: "/sesiones", readAt: null, metadata: {paymentOperationId: operationId, status}, createdAt: now,
  });
}
async function releaseContext(transaction, db, context) {
  if (!context || !context.therapy || !isOpenAppointment(context.appointment.estado)) {
    throw new HttpsError("failed-precondition", "La reserva requiere revisión de consistencia.");
  }
  const slotId = context.appointment.availabilitySlotId;
  return slotId ? await transaction.get(db.doc(`therapist_availability/${requireDocumentId(slotId)}`)) : null;
}
function releaseReservation(transaction, context, slot, status, now) {
  const id = context.appointmentRef.id;
  transaction.update(context.appointmentRef, {
    estado: "cancelada", paymentStatus: status, cancellationReason: `payment_${status}`,
    version: Number(context.appointment.version || 1) + 1, cancelledAt: now, updatedAt: now,
  });
  const old = (context.therapy.citas || []).find((item) => (item.citaId || item.id) === id);
  if (!old) throw new HttpsError("failed-precondition", "Falta la cita en el resumen de terapia.");
  transaction.update(context.therapyRef, {
    citas: replaceAppointmentSummary(context.therapy.citas, id, {...old, estado: "cancelada", paymentStatus: status,
      version: Number(context.appointment.version || 1) + 1}), updatedAt: now,
  });
  if (slot?.exists && slot.data().appointmentId === id) {
    transaction.update(slot.ref, {status: "available", bookedBy: "", appointmentId: "", updatedAt: now});
  }
}
async function reviewPaymentOperation(request) {
  const auth = requireAuth(request);
  const data = request.data || {};
  const operationId = requireDocumentId(data.operationId);
  const nextStatus = cleanText(data.status, 40, true);
  const providerReference = cleanText(data.providerReference, 180);
  const note = cleanText(data.note, 600);
  const db = firestoreAdmin.getFirestore();
  const ref = db.doc(`payment_operations/${operationId}`);
  return db.runTransaction(async (transaction) => {
    await requireOperator(db, auth, transaction);
    const operation = (await transaction.get(ref)).data();
    if (!operation) throw new HttpsError("not-found", "La operación no existe.");
    if (operation.status === nextStatus && operation.providerReference === providerReference) return {operationId, status: nextStatus};
    assertPaymentTransition(operation.status, nextStatus);
    const policy = snapshotPolicy(operation.rateSnapshot?.commercialPolicy);
    const financial = ["confirmed", "refunded"].includes(nextStatus);
    if (financial && !providerReference) throw new HttpsError("invalid-argument", "Registra la referencia verificable del proveedor.");
    const receipt = financial ? receiptRef(db, policy, nextStatus === "confirmed" ? "payment" : "refund", providerReference) : null;
    const existingReceipt = receipt ? (await transaction.get(receipt)).data() : null;
    if (existingReceipt && existingReceipt.operationId !== operationId) {
      throw new HttpsError("already-exists", "Esta referencia del proveedor ya acredita otra operación.");
    }
    // A reviewed refund cannot replace the original payment receipt with a different payment.
    if (nextStatus === "confirmed" && operation.paymentReference && operation.paymentReference !== providerReference) {
      throw new HttpsError("failed-precondition", "Conserva la referencia del pago original.");
    }
    const context = await loadAppointmentContext(transaction, db, operation);
    if (!context?.therapy) throw new HttpsError("failed-precondition", "La reserva requiere revisión de consistencia.");
    if (nextStatus === "confirmed" && context.appointment.estado === "cancelada") {
      throw new HttpsError("failed-precondition", "No se puede acreditar una reserva cerrada.");
    }
    const release = nextStatus === "rejected" || nextStatus === "refunded" && isOpenAppointment(context.appointment.estado);
    const slot = release ? await releaseContext(transaction, db, context) : null;
    const obligationRef = db.doc(`professional_obligations/${operationId}`);
    const obligation = (await transaction.get(obligationRef)).data();
    const patient = await transaction.get(db.doc(`users/${operation.patientUid}`));
    const now = FieldValue.serverTimestamp();
    if (patient.exists) transaction.update(patient.ref, {lastActivityAt: now});
    if (receipt && !existingReceipt) transaction.create(receipt, {operationId, kind: nextStatus, createdAt: now});
    transaction.create(db.collection("payment_audit").doc(), {operationId, actorUid: auth.uid, previousStatus: operation.status, status: nextStatus, providerReference, note, createdAt: now});
    transaction.update(ref, {
      status: nextStatus, providerReference, ...(nextStatus === "confirmed" ? {paymentReference: providerReference} : {}),
      reconciliationNote: note, reconciledBy: auth.uid, reconciledAt: now, updatedAt: now,
    });
    if (release) releaseReservation(transaction, context, slot, nextStatus, now);
    else syncAppointmentPaymentStatus(transaction, context, nextStatus, now);
    if (nextStatus === "confirmed") {
      const amounts = obligationAmounts(operation);
      transaction.set(obligationRef, {
        operationId, therapistId: operation.therapistId, patientUid: operation.patientUid,
        currency: operation.currency, ...amounts, paidMinor: obligation?.paidMinor || 0,
        pendingMinor: Math.max(0, amounts.calculatedMinor - (obligation?.paidMinor || 0)),
        status: (obligation?.paidMinor || 0) >= amounts.calculatedMinor ? "settled" : "pending",
        policy, createdAt: obligation?.createdAt || now, updatedAt: now,
      });
    } else if (nextStatus === "refunded" && obligation) {
      transaction.update(obligationRef, {pendingMinor: 0,
        status: obligation.paidMinor > 0 ? "recovery_review" : "void",
        recoveryReviewMinor: obligation.paidMinor || 0, updatedAt: now});
    }
    paymentEvent(transaction, db, operationId, operation, nextStatus, auth.uid, now);
    return {operationId, status: nextStatus};
  });
}

// Manual operator command: never contacts a payment provider or moves money.
async function expirePaymentReservation(request) {
  const auth = requireAuth(request);
  const operationId = requireDocumentId(request.data?.operationId);
  const db = firestoreAdmin.getFirestore();
  return db.runTransaction(async (transaction) => {
    await requireOperator(db, auth, transaction);
    const ref = db.doc(`payment_operations/${operationId}`);
    const operation = (await transaction.get(ref)).data();
    if (!operation) throw new HttpsError("not-found", "La operación no existe.");
    if (operation.status === "expired") return {operationId, status: "expired"};
    const policy = snapshotPolicy(operation.rateSnapshot?.commercialPolicy);
    if (!(operation.status === "pending" || operation.status === "submitted" && policy.submittedExpiration === "expire")) {
      throw new HttpsError("failed-precondition", "La operación no admite vencimiento manual según su política.");
    }
    const deadline = typeof operation.expiresAt?.toMillis === "function" ? operation.expiresAt.toMillis() : NaN;
    if (!Number.isFinite(deadline) || deadline > Date.now()) {
      throw new HttpsError("failed-precondition", "La reserva no tiene un plazo vencido válido.");
    }
    const context = await loadAppointmentContext(transaction, db, operation);
    const slot = await releaseContext(transaction, db, context);
    const now = FieldValue.serverTimestamp();
    transaction.create(db.collection("payment_audit").doc(), {operationId, actorUid: auth.uid, previousStatus: operation.status, status: "expired", note: cleanText(request.data?.note, 600), createdAt: now});
    transaction.update(ref, {status: "expired", expiredAt: now, expiredBy: auth.uid, updatedAt: now});
    releaseReservation(transaction, context, slot, "expired", now);
    paymentEvent(transaction, db, operationId, operation, "expired", auth.uid, now);
    return {operationId, status: "expired"};
  });
}
async function recordProfessionalTransfer(request) {
  const auth = requireAuth(request);
  const operationId = requireDocumentId(request.data?.operationId);
  const reference = cleanText(request.data?.transferReference, 180, true);
  const amountMinor = request.data?.amountMinor;
  const currency = cleanText(request.data?.currency, 3, true);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new HttpsError("invalid-argument", "Importe de transferencia inválido.");
  const db = firestoreAdmin.getFirestore();
  return db.runTransaction(async (transaction) => {
    await requireOperator(db, auth, transaction);
    const ref = db.doc(`professional_obligations/${operationId}`);
    const obligation = (await transaction.get(ref)).data();
    if (!obligation) throw new HttpsError("failed-precondition", "No existe obligación conciliada.");
    const policy = snapshotPolicy(obligation.policy);
    const transferRef = db.doc(`professional_transfers/${fingerprint({merchant: policy.merchantAccount, reference})}`);
    const previous = (await transaction.get(transferRef)).data();
    if (previous) {
      if (previous.operationId !== operationId || previous.amountMinor !== amountMinor || previous.currency !== currency) {
        throw new HttpsError("already-exists", "La referencia de transferencia ya fue registrada con otros datos.");
      }
      return {transferId: transferRef.id, recorded: true};
    }
    // Reading the payment serializes transfers against refund and cancellation.
    const payment = (await transaction.get(db.doc(`payment_operations/${operationId}`))).data();
    if (payment?.status !== "confirmed" || obligation.status !== "pending" ||
        amountMinor > obligation.pendingMinor || currency !== obligation.currency) {
      throw new HttpsError("failed-precondition", "La obligación no admite esta transferencia.");
    }
    const professional = (await transaction.get(db.doc(`therapists/${obligation.therapistId}`))).data();
    const owner = professional?.uid ? await transaction.get(db.doc(`users/${professional.uid}`)) : null;
    const now = FieldValue.serverTimestamp();
    if (owner?.exists) transaction.update(owner.ref, {lastActivityAt: now});
    transaction.create(transferRef, {operationId, therapistId: obligation.therapistId, amountMinor, currency,
      transferReference: reference, recordedBy: auth.uid, createdAt: now});
    transaction.update(ref, {paidMinor: obligation.paidMinor + amountMinor, pendingMinor: obligation.pendingMinor - amountMinor,
      status: obligation.pendingMinor === amountMinor ? "settled" : "pending", updatedAt: now});
    return {transferId: transferRef.id, recorded: true};
  });
}
module.exports = {assertPaymentTransition, getBookingQuote, markPaymentSubmitted, quoteFromRate,
  requestPaymentRefundReview, reviewPaymentOperation, expirePaymentReservation, recordProfessionalTransfer};
