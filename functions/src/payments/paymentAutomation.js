/* eslint-disable max-len */
const {getFirestore, FieldValue, Timestamp, FieldPath} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {requirePatientAccess} = require("../accounts/accessPolicy");
const {requireDocumentId} = require("./paymentRates");
const {fingerprint, snapshotPolicy, obligationAmounts} = require("./commercialPolicy");
const {automationConfig, providerClient, checkoutUrl, verifySignature, validatePayment, amountMinor} = require("./mercadoPago");
const {loadAppointmentContext, syncAppointmentPaymentStatus, releaseContext, releaseReservation, receiptRef, paymentEvent, expireOperation} = require("./paymentOperationHandlers");
const {isOpenAppointment, replaceAppointmentSummary} = require("../appointments/appointmentDomain");
const {operationalException, bootstrapTasks, ensureChecklist, reopenDueChecklist} = require("../operations/adminTasks");

async function createCheckout(db, uid, operationId, config, client, clock = Date.now) {
  const ref = db.doc(`payment_operations/${operationId}`);
  const operation = await db.runTransaction(async (tx) => {
    const op = (await tx.get(ref)).data();
    if (!op || op.patientUid !== uid) throw new HttpsError("permission-denied", "La operación no te pertenece.");
    if (op.reconciliation !== "automatic") throw new HttpsError("failed-precondition", "Esta reserva anterior utiliza conciliación administrativa.");
    snapshotPolicy(op.rateSnapshot?.commercialPolicy);
    if (op.status !== "pending" || !(op.expiresAt?.toMillis() > clock())) throw new HttpsError("failed-precondition", "Venció tu tiempo para pagar. Vuelve a seleccionar un horario.");
    if (op.providerAccountId && (op.providerAccountId !== config.collectorId || op.providerMode !== config.mode)) throw new HttpsError("failed-precondition", "La cuenta de cobro cambió. Solicita revisión administrativa.");
    if (op.checkoutUrl) return op;
    if (op.checkoutLeaseUntil > clock()) throw new HttpsError("aborted", "Estamos preparando tu pago. Reintenta en unos segundos.");
    tx.update(ref, {checkoutLeaseUntil: clock() + 30000, nextProviderCheckAt: Timestamp.fromMillis(clock() + 120000), providerAccountId: config.collectorId, providerMode: config.mode, updatedAt: FieldValue.serverTimestamp()});
    return op;
  });
  if (operation.checkoutUrl) return {url: checkoutUrl({init_point: operation.checkoutUrl, sandbox_init_point: operation.checkoutUrl}, config)};
  try {
    const back = `${config.publicOrigin}/sesiones?operation=${encodeURIComponent(operationId)}`;
    const preference = await client.createPreference({
      items: [{id: operationId, title: "Reserva de sesión", quantity: 1, currency_id: operation.currency, unit_price: operation.amountMinor / 100}],
      external_reference: operationId, metadata: {operation_id: operationId}, notification_url: config.notificationUrl,
      back_urls: {success: back, pending: back, failure: back}, auto_return: "approved", expires: true,
      expiration_date_from: new Date(clock()).toISOString(), expiration_date_to: operation.expiresAt.toDate().toISOString(),
    }, `lurems-${operationId}`);
    if (String(preference.collector_id) !== config.collectorId) throw new Error("La preferencia corresponde a otro comercio.");
    const url = checkoutUrl(preference, config);
    await db.runTransaction(async (tx) => {
      const op = (await tx.get(ref)).data();
      if (op.status !== "pending" || op.expiresAt.toMillis() <= clock()) throw new HttpsError("failed-precondition", "El plazo terminó. Vuelve a seleccionar un horario.");
      tx.update(ref, {checkoutUrl: url, preferenceId: String(preference.id), checkoutLeaseUntil: 0,
        nextProviderCheckAt: Timestamp.fromMillis(clock() + 120000), providerCheckAttempts: 0, updatedAt: FieldValue.serverTimestamp()});
    });
    return {url};
  } catch (error) {
    await ref.update({checkoutLeaseUntil: 0}).catch(() => {});
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("unavailable", "No pudimos abrir el pago. Tu reserva conserva su plazo; vuelve a intentarlo.");
  }
}
async function createPaymentCheckout(request) {
  await requirePatientAccess(request);
  const config = automationConfig();
  if (!config) throw new HttpsError("failed-precondition", "Los pagos automáticos aún no están habilitados.");
  return createCheckout(getFirestore(), request.auth.uid, requireDocumentId(request.data?.operationId), config, providerClient());
}

function confirmAppointment(tx, context, now) {
  const version = Number(context.appointment.version || 1) + 1;
  const id = context.appointmentRef.id;
  const summary = context.therapy.citas?.find((cita) => (cita.citaId || cita.id) === id);
  if (!summary) throw new Error("Falta el resumen de la reserva.");
  tx.update(context.appointmentRef, {estado: "confirmada", paymentStatus: "confirmed", version, updatedAt: now});
  tx.update(context.therapyRef, {citas: replaceAppointmentSummary(context.therapy.citas, id, {...summary, estado: "confirmada", paymentStatus: "confirmed", version}), updatedAt: now});
}

async function applyProviderPayment(db, payment, config) {
  const operationId = String(payment.external_reference || "");
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(operationId)) return {ignored: true};
  const ref = db.doc(`payment_operations/${operationId}`);
  const outcome = await db.runTransaction(async (tx) => {
    const operation = (await tx.get(ref)).data();
    if (!operation || operation.reconciliation !== "automatic") return {ignored: true};
    const problem = validatePayment(payment, {id: operationId, ...operation}, {
      ...config, collectorId: operation.providerAccountId || config.collectorId, mode: operation.providerMode || config.mode,
    });
    if (problem) return {exception: problem};
    const paymentId = String(payment.id);
    const status = payment.status;
    const providerStateFingerprint = fingerprint({id: paymentId, status, refunded: payment.transaction_amount_refunded || 0});
    if (operation.providerStateFingerprint === providerStateFingerprint) return {unchanged: true};
    const policy = snapshotPolicy(operation.rateSnapshot?.commercialPolicy);
    const receipt = receiptRef(db, policy, "payment", paymentId);
    const previousReceipt = (await tx.get(receipt)).data();
    if (previousReceipt && previousReceipt.operationId !== operationId) return {exception: "receipt_reused"};
    if (operation.paymentReference && operation.paymentReference !== paymentId && ["approved", "refunded", "charged_back"].includes(status)) return {exception: "duplicate_payment"};
    if (!["approved", "refunded", "charged_back"].includes(status)) {
      if (operation.status === "pending" && operation.providerStatus !== status) tx.update(ref, {providerStatus: String(status || "unknown").slice(0, 40), updatedAt: FieldValue.serverTimestamp()});
      return {pending: true};
    }
    const partialRefund = status === "approved" && Number(payment.transaction_amount_refunded) > 0;
    if (operation.status === "refunded" || operation.status === "confirmed" && status === "approved" && !partialRefund) return {unchanged: true};
    if (operation.status === "refund_review" && status === "approved" && !partialRefund) return {unchanged: true};
    const context = await loadAppointmentContext(tx, db, operation);
    if (!context?.therapy) return {exception: "reservation_inconsistent"};
    const obligationRef = db.doc(`professional_obligations/${operationId}`);
    const obligation = (await tx.get(obligationRef)).data();
    const open = isOpenAppointment(context.appointment.estado);
    const slot = open ? await releaseContext(tx, db, context) : null;
    const professional = (await tx.get(db.doc(`therapists/${operation.therapistId}`))).data();
    const owner = professional?.uid ? (await tx.get(db.doc(`users/${professional.uid}`))).data() : null;
    const canAttend = Boolean(professional && professional.activo !== false && owner && owner.accountStatus !== "suspended");
    const paidAt = new Date(payment.date_approved || "").getTime();
    const timely = Number.isFinite(paidAt) && paidAt <= operation.expiresAt?.toMillis() && Date.now() <= operation.expiresAt?.toMillis();
    const ownsSlot = Boolean(slot?.exists && slot.data().status === "booked" && slot.data().appointmentId === context.appointmentRef.id);
    let nextStatus = "refund_review";
    if (status === "refunded" && amountMinor(payment.transaction_amount_refunded) === operation.amountMinor) nextStatus = "refunded";
    else if (status === "approved" && !partialRefund && operation.status === "pending" && timely && open && ownsSlot && canAttend) nextStatus = "confirmed";
    const reason = nextStatus === "refund_review" ? (status === "charged_back" ? "provider_chargeback" : partialRefund ? "partial_refund" : !canAttend ? "professional_unavailable" : "late_or_closed_payment") : "";
    const now = FieldValue.serverTimestamp();
    if (!previousReceipt) tx.create(receipt, {operationId, kind: "payment", createdAt: now});
    tx.update(ref, {status: nextStatus, providerStatus: status, providerStateFingerprint, providerReference: paymentId, paymentReference: paymentId,
      ...(reason ? {refundReason: reason, refundRequestedAt: now} : {}),
      reconciledBy: "system:mercado_pago", reconciledAt: now, updatedAt: now});
    if (nextStatus === "confirmed") {
      confirmAppointment(tx, context, now);
      const amounts = obligationAmounts(operation);
      tx.set(obligationRef, {operationId, therapistId: operation.therapistId, patientUid: operation.patientUid, currency: operation.currency,
        ...amounts, paidMinor: 0, pendingMinor: amounts.calculatedMinor, status: "pending", policy, createdAt: now, updatedAt: now});
    } else {
      if (open) releaseReservation(tx, context, slot, nextStatus, now);
      else syncAppointmentPaymentStatus(tx, context, nextStatus, now);
      if (obligation) {
        tx.update(obligationRef, {pendingMinor: 0,
          status: nextStatus === "refunded" ? obligation.paidMinor > 0 ? "recovery_review" : "void" : "refund_review",
          recoveryReviewMinor: nextStatus === "refunded" ? obligation.paidMinor || 0 : 0, updatedAt: now});
      }
    }
    tx.create(db.collection("payment_audit").doc(), {operationId, actorUid: "system:mercado_pago", previousStatus: operation.status, status: nextStatus,
      providerReference: paymentId, note: reason || "Estado verificado mediante API del proveedor", createdAt: now});
    paymentEvent(tx, db, operationId, operation, nextStatus, "system:mercado_pago", now);
    return {status: nextStatus};
  });
  if (outcome.exception) await operationalException(db, outcome.exception, `${operationId}_${payment.id}`, `Código ${outcome.exception}. Comparar el pago ${payment.id} con la reserva; no se acreditó automáticamente.`, operationId);
  return outcome;
}

async function mercadoPagoWebhook(req, res) {
  return ingestPaymentNotification(req, res);
}
async function ingestPaymentNotification(req, res, dependencies = {}) {
  if (req.method !== "POST") return res.status(405).end();
  let config;
  try {
    config = dependencies.config || automationConfig();
  } catch {
    return res.status(503).end();
  }
  if (!config) return res.status(503).end();
  const dataId = typeof req.query["data.id"] === "string" ? req.query["data.id"] : "";
  const requestId = req.get("x-request-id");
  if (!verifySignature({dataId, requestId, signature: req.get("x-signature")}, dependencies.secret || process.env.MERCADOPAGO_WEBHOOK_SECRET)) return res.status(401).end();
  if (req.body?.data?.id && String(req.body.data.id).toLowerCase() !== dataId.toLowerCase()) return res.status(400).end();
  if ((req.query.type || req.body?.type) !== "payment" || !/^\d+$/.test(dataId)) return res.status(200).end();
  // Persist before acknowledging: background work survives process shutdown and duplicate delivery.
  const id = fingerprint({dataId, requestId});
  try {
    await (dependencies.db || getFirestore()).doc(`payment_webhook_inbox/${id}`).create({paymentId: dataId, status: "pending", attempts: 0,
      nextAttemptAt: Timestamp.now(), createdAt: FieldValue.serverTimestamp()});
  } catch (error) {
    if (error.code !== 6 && error.code !== "already-exists") return res.status(503).end();
  }
  return res.status(200).end();
}
async function processInbox(db, id, client, config) {
  const ref = db.doc(`payment_webhook_inbox/${id}`);
  const event = await db.runTransaction(async (tx) => {
    const value = (await tx.get(ref)).data();
    if (!value || value.status === "done" || value.leaseUntil > Date.now()) return null;
    tx.update(ref, {leaseUntil: Date.now() + 45000, attempts: (value.attempts || 0) + 1});
    return value;
  });
  if (!event) return;
  try {
    const payment = await client.getPayment(event.paymentId);
    if (String(payment.id) !== event.paymentId) throw new Error("El proveedor devolvió otro pago.");
    await applyProviderPayment(db, payment, config);
    await ref.update({status: "done", leaseUntil: 0, processedAt: FieldValue.serverTimestamp()});
    await db.doc("operations_health/payments").set({lastProviderSuccess: FieldValue.serverTimestamp()}, {merge: true});
  } catch {
    const attempts = (event.attempts || 0) + 1;
    await ref.update({leaseUntil: 0, nextAttemptAt: Timestamp.fromMillis(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(attempts, 6)))});
    if (attempts >= 3) await operationalException(db, "webhook_processing", event.paymentId, `No se pudo verificar el pago ${event.paymentId}. La conciliación seguirá reintentándose; revisar conexión y credenciales.`);
  }
}

async function runPaymentMaintenance(db = getFirestore(), config, client) {
  if (config === undefined) {
    try {
      config = automationConfig();
    } catch {
      config = null;
      await operationalException(db, "payment_configuration", "configuration", "La configuración de pagos es inválida. Corregirla; el vencimiento de reservas sigue funcionando.");
    }
  }
  if (config && !client) client = providerClient();
  let expired = 0;
  const healthRef = db.doc("operations_health/payments");
  const health = (await healthRef.get()).data() || {};
  let dueQuery = db.collection("payment_operations").where("status", "in", ["pending", "submitted"]).where("expiresAt", "<=", Timestamp.now()).orderBy("expiresAt").orderBy(FieldPath.documentId()).limit(100);
  if (health.expiryCursorAt && health.expiryCursorId) dueQuery = dueQuery.startAfter(health.expiryCursorAt, health.expiryCursorId);
  const due = await dueQuery.get();
  // A cursor prevents legacy preserved submissions or inconsistent records from starving newer expirations.
  for (const doc of due.docs) {
    const op = doc.data();
    if (op.status === "submitted" && op.rateSnapshot?.commercialPolicy?.submittedExpiration === "preserve_for_review") continue;
    try {
      const result = await expireOperation(db, doc.id); if (result.status === "expired") expired++;
    } catch {
      await operationalException(db, "expiry_inconsistent", doc.id, "No se pudo liberar la reserva vencida. Revisar su consistencia y el horario.", doc.id);
    }
  }
  if (config && client) {
    const inbox = await db.collection("payment_webhook_inbox").where("status", "==", "pending").where("nextAttemptAt", "<=", Timestamp.now()).orderBy("nextAttemptAt").limit(10).get();
    for (const doc of inbox.docs) await processInbox(db, doc.id, client, config);
    const checks = await db.collection("payment_operations").where("nextProviderCheckAt", "<=", Timestamp.now()).orderBy("nextProviderCheckAt").limit(10).get();
    for (const doc of checks.docs) {
      const op = doc.data();
      try {
        const payments = await client.searchPayments(doc.id);
        for (const payment of payments) await applyProviderPayment(db, payment, config);
        const attempts = (op.providerCheckAttempts || 0) + 1;
        // Short checks through hold expiry, then daily checks for seven days; webhooks remain authoritative afterwards.
        const elapsed = Date.now() - op.expiresAt.toMillis();
        await doc.ref.update({providerCheckAttempts: attempts, nextProviderCheckAt: elapsed > 7 * 86400000 ? FieldValue.delete() : Timestamp.fromMillis(Date.now() + (elapsed > 3600000 ? 86400000 : Math.min(900000, 120000 * attempts)))});
        await db.doc("operations_health/payments").set({lastProviderSuccess: FieldValue.serverTimestamp()}, {merge: true});
      } catch {
        await doc.ref.update({nextProviderCheckAt: Timestamp.fromMillis(Date.now() + 900000)});
        await operationalException(db, "provider_unavailable", doc.id, "No se pudo comprobar el pago con el proveedor. Se reintentará; revisar la conexión si persiste.", doc.id);
      }
    }
  }
  if (!health.checklistInitialized) await ensureChecklist(db);
  const taskBackfillComplete = health.taskBackfillComplete || await bootstrapTasks(db);
  await reopenDueChecklist(db);
  await db.doc("operations_health/payments").set({lastRun: FieldValue.serverTimestamp(), checklistInitialized: true, taskBackfillComplete: Boolean(taskBackfillComplete), expiredLastRun: expired, expiryBatchFull: due.size === 100,
    expiryCursorAt: due.size === 100 ? due.docs.at(-1).data().expiresAt : null, expiryCursorId: due.size === 100 ? due.docs.at(-1).id : null}, {merge: true});
  return {expired};
}
module.exports = {createCheckout, createPaymentCheckout, applyProviderPayment, mercadoPagoWebhook, ingestPaymentNotification, processInbox, runPaymentMaintenance};

async function refreshOwnPaymentReservation(request) {
  await requirePatientAccess(request);
  const db = getFirestore();
  const operationId = requireDocumentId(request.data?.operationId);
  const op = (await db.doc(`payment_operations/${operationId}`).get()).data();
  if (!op || op.patientUid !== request.auth.uid) throw new HttpsError("permission-denied", "La operación no te pertenece.");
  return expireOperation(db, operationId);
}
module.exports.refreshOwnPaymentReservation = refreshOwnPaymentReservation;
