/* eslint-disable max-len */
const {getFirestore, FieldValue, FieldPath, Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {requireAdmin} = require("../accounts/adminHandlers");
const {requireDocumentId} = require("../payments/paymentRates");
const {fingerprint} = require("../payments/commercialPolicy");
const {automationConfig} = require("../payments/mercadoPago");

const CHECKLIST = [
  ["payment_setup", "Revisar cobros y conciliación", "Verificar tarifas, cuenta de destino, enlaces de pago y comprobantes. Registrar la revisión de pagos y devoluciones con evidencia.", "/admin/conciliacion", 30],
  ["budgets", "Revisar costos y límites", "Revisar Firebase, hosting e IA por separado; registrar gasto, presupuesto y acciones ante alertas.", "/admin/alertas", 7],
  ["coverage", "Revisar profesionales, tarifas y cobertura", "Comprobar profesionales activos, tarifas comerciales, horarios y disponibilidad de atención.", "/admin/cobros", 7],
  ["support_qa", "Verificar acceso y recuperación de cuenta", "Comprobar ingreso, recuperación de contraseña, notificaciones y atención de soporte en dispositivos reales.", "/admin/soporte", 30],
  ["clinical", "Revisar calidad y seguridad de la orientación", "Coordinar la validación con el responsable clínico, registrar evidencia y atender los hallazgos.", "/admin/alertas", 30],
  ["retention", "Revisar privacidad y conservación", "Revisar solicitudes de eliminación, política aprobada y conservación de registros financieros y clínicos.", "/admin/usuarios", 30],
  ["recovery", "Verificar respaldo y recuperación", "Registrar la última verificación autorizada de respaldo, recuperación y procedimiento de contingencia.", "/admin/alertas", 30],
];
const SOURCES = ["payment_operations", "professional_obligations", "support_requests", "operational_alerts", "therapists", "account_requests", "psychologist_requests"];
function taskId(type, id) {
  return `${type}_${fingerprint(id).slice(0, 40)}`;
}

async function writeTask(tx, db, id, spec, active) {
  const ref = db.doc(`admin_tasks/${id}`);
  const current = (await tx.get(ref)).data();
  if (current?.sourceReadAt && spec.sourceReadAt &&
      (current.sourceReadAt.seconds > spec.sourceReadAt.seconds || current.sourceReadAt.seconds === spec.sourceReadAt.seconds && current.sourceReadAt.nanoseconds > spec.sourceReadAt.nanoseconds)) return;
  if (!active && !current) return;
  if (!active && current) spec = {...spec, title: current.title, description: current.description};
  const {sourceReadAt, ...content} = spec;
  const hash = fingerprint(content);
  if (current?.sourceFingerprint === hash && (active ? current.status !== "resolved" : current.status === "resolved")) {
    if (sourceReadAt) tx.update(ref, {sourceReadAt});
    return;
  }
  const now = FieldValue.serverTimestamp();
  tx.set(ref, {...spec, sourceFingerprint: hash, status: active ? (current?.status === "resolved" ? "open" : current?.status || "open") : "resolved",
    assignedTo: current?.assignedTo || "", version: (current?.version || 0) + 1, createdAt: current?.createdAt || now,
    updatedAt: now, resolvedAt: active ? null : now}, {merge: true});
  tx.create(ref.collection("history").doc(), {actorUid: "system:operations", action: active ? "source_pending" : "source_resolved", note: "Actualización de la fuente operativa", createdAt: now});
}
async function putTask(db, id, spec, active = true) {
  return db.runTransaction((tx) => writeTask(tx, db, id, spec, active));
}
async function operationalException(db, code, sourceId, description, operationId = "") {
  return putTask(db, taskId(code, sourceId), {kind: "exception", code, sourceId, operationId,
    title: "Incidencia de pago: revisión requerida", description, priority: "critical",
    sourceRoute: operationId ? `/admin/conciliacion?operation=${encodeURIComponent(operationId)}` : "/admin/alertas"});
}

async function syncSource(db, collection, id) {
  // A consistent read-only snapshot avoids locking payment, appointment and identity documents.
  // The task CAS below orders snapshots, so a delayed event cannot overwrite a newer source state.
  const state = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(db.doc(`${collection}/${id}`));
    const data = snapshot.data();
    const base = {sourceCollection: collection, sourceId: id, priority: "normal"};
    let spec; let active;
    if (collection === "payment_operations") {
      active = ["refund_review", "submitted"].includes(data?.status);
      spec = {...base, kind: "payment", priority: data?.status === "refund_review" ? "high" : "normal",
        title: data?.status === "refund_review" ? "Resolver devolución" : "Verificar aviso de pago anterior",
        description: "Revisar el pago, la reserva y la evidencia del proveedor. La tarea se cierra cuando se resuelve la operación.",
        operationId: id, sourceRoute: `/admin/conciliacion?operation=${encodeURIComponent(id)}`};
    } else if (collection === "professional_obligations") {
      active = data?.status === "pending" && data.pendingMinor > 0 || data?.status === "recovery_review";
      spec = {...base, kind: "transfer", priority: "high", title: data?.status === "recovery_review" ? "Revisar recuperación de transferencia" : "Liquidar saldo profesional",
        description: "Verificar el saldo y registrar el movimiento externo con referencia verificable.", operationId: id,
        sourceRoute: `/admin/conciliacion?operation=${encodeURIComponent(id)}`};
    } else if (collection === "support_requests") {
      active = Boolean(data && data.status !== "resolved");
      spec = {...base, kind: "support", title: "Responder y resolver soporte", description: `Solicitud ${id}. Revisar y responder desde soporte.`, sourceRoute: `/admin/soporte?case=${encodeURIComponent(id)}`};
    } else if (collection === "operational_alerts") {
      active = Boolean(data && data.status !== "acknowledged");
      spec = {...base, kind: "alert", priority: data?.severity === "critical" ? "critical" : "high", title: "Revisar alerta de operación",
        description: `${data?.operation || "Operación"}: ${data?.code || "incidencia"}. Registrar diagnóstico y atención.`, sourceRoute: `/admin/alertas?case=${encodeURIComponent(id)}`};
    } else if (collection === "therapists") {
      const owner = data?.uid ? (await tx.get(db.doc(`users/${data.uid}`))).data() : null;
      const unavailable = !data || data.activo === false || owner?.accountStatus === "suspended" || !owner;
      const future = unavailable ? await tx.get(db.collection("citas").where("terapeutaId", "==", id).where("estado", "in", ["pendiente", "confirmada"]).where("startAt", ">", Timestamp.now()).limit(1)) : null;
      active = Boolean(future && !future.empty);
      spec = {...base, kind: "professional", priority: "high", title: "Resolver citas de profesional no disponible",
        therapistId: id, description: "Revisar la agenda futura. Coordinar con el paciente y cancelar las reservas afectadas; los pagos confirmados generan revisión de devolución.", sourceRoute: "/admin/operaciones"};
    } else if (collection === "account_requests") {
      active = Boolean(data && data.type === "account_deletion" && !["completed_under_policy", "rejected", "cancelled"].includes(data.status));
      spec = {...base, kind: "privacy", title: "Atender solicitud de eliminación", description: `Revisar la solicitud de ${data?.requesterUid || id} bajo la política de conservación aprobada.`, sourceRoute: "/admin/usuarios"};
    } else if (collection === "psychologist_requests") {
      active = Boolean(data && !["approved", "rejected"].includes(data.status));
      spec = {...base, kind: "application", title: "Revisar solicitud profesional", description: `Solicitud ${id}. Verificar requisitos y registrar la decisión.`, sourceRoute: `/admin/solicitudes-psicologos?case=${encodeURIComponent(id)}`};
    } else return;
    return {spec: {...spec, sourceReadAt: snapshot.readTime}, active};
  }, {readOnly: true});
  if (state) await putTask(db, taskId(collection, id), state.spec, state.active);
}

async function ensureChecklist(db) {
  for (const [id, title, description, sourceRoute, reviewDays] of CHECKLIST) {
    const ref = db.doc(`admin_tasks/check_${id}`);
    await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return;
      tx.create(ref, {kind: "checklist", code: id, title, description, sourceRoute, reviewDays, priority: "normal", status: "open",
        assignedTo: "", version: 1, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()});
    });
  }
}
// One bounded page per collection, persisted cursor; no silent truncation of existing records.
async function bootstrapTasks(db) {
  const ref = db.doc("operations_health/task_backfill");
  const state = (await ref.get()).data() || {};
  for (const collection of SOURCES) {
    if (state[`${collection}Done`]) continue;
    const activeStates = {payment_operations: ["refund_review", "submitted"], professional_obligations: ["pending", "recovery_review"],
      support_requests: ["open", "in_progress"], operational_alerts: ["open", "reopened"], psychologist_requests: ["pending"]};
    let query = db.collection(collection);
    if (activeStates[collection]) query = query.where("status", "in", activeStates[collection]);
    query = query.orderBy(FieldPath.documentId()).limit(30);
    if (state[collection]) query = query.startAfter(state[collection]);
    const page = await query.get();
    for (const doc of page.docs) await syncSource(db, collection, doc.id);
    await ref.set({[collection]: page.docs.at(-1)?.id || state[collection] || "", [`${collection}Done`]: page.size < 30, updatedAt: FieldValue.serverTimestamp()}, {merge: true});
    state[`${collection}Done`] = page.size < 30;
  }
  return SOURCES.every((source) => state[`${source}Done`]);
}

async function getAdminOperationsOverview(request) {
  const db = getFirestore();
  await db.runTransaction((tx) => requireAdmin(tx, db, request.auth));
  await ensureChecklist(db);
  const health = (await db.doc("operations_health/payments").get()).data() || {};
  const backfill = (await db.doc("operations_health/task_backfill").get()).data() || {};
  let config; let configurationError = false;
  try {
    config = automationConfig();
  } catch {
    configurationError = true;
  }
  return {automationEnabled: Boolean(config), mode: config?.mode || "disabled", configurationError,
    lastRun: health.lastRun?.toDate?.().toISOString() || null, expiredLastRun: health.expiredLastRun || 0,
    lastProviderSuccess: health.lastProviderSuccess?.toDate?.().toISOString() || null,
    backfillComplete: SOURCES.every((source) => backfill[`${source}Done`])};
}
async function updateAdminTask(request) {
  const db = getFirestore(); const data = request.data || {};
  const id = requireDocumentId(data.taskId);
  const note = typeof data.note === "string" ? data.note.trim() : "";
  if (!note || note.length > 1200 || !["open", "in_progress", "blocked", "resolved"].includes(data.status)) throw new HttpsError("invalid-argument", "Escribe una nota y un estado válido.");
  const ref = db.doc(`admin_tasks/${id}`);
  return db.runTransaction(async (tx) => {
    await requireAdmin(tx, db, request.auth);
    const task = (await tx.get(ref)).data();
    if (!task) throw new HttpsError("not-found", "La tarea no existe.");
    if (task.status === "resolved" && !["checklist", "exception"].includes(task.kind)) throw new HttpsError("failed-precondition", "El caso ya se resolvió. Reábrelo desde su pantalla de origen si corresponde.");
    if (data.expectedVersion !== task.version) throw new HttpsError("aborted", "La tarea cambió. Revisa la versión actual.");
    if (data.status === "resolved" && !["checklist", "exception"].includes(task.kind)) throw new HttpsError("failed-precondition", "Resuelve el caso desde su pantalla de origen. La tarea se cerrará automáticamente.");
    if (data.status === "resolved" && task.kind === "exception" && note.length < 20) throw new HttpsError("invalid-argument", "Registra la decisión y la referencia verificable de su resolución.");
    const now = FieldValue.serverTimestamp();
    const version = task.version + 1;
    tx.update(ref, {status: data.status, assignedTo: data.assignToMe ? request.auth.uid : task.assignedTo || "", lastNote: note,
      version, updatedAt: now, updatedBy: request.auth.uid, resolvedAt: data.status === "resolved" ? now : null,
      ...(task.kind === "checklist" && data.status === "resolved" ? {reviewAt: Timestamp.fromMillis(Date.now() + task.reviewDays * 86400000)} : {})});
    tx.create(ref.collection("history").doc(), {actorUid: request.auth.uid, action: data.status, note, version, createdAt: now});
    return {taskId: id, version};
  });
}
async function getAdminTaskHistory(request) {
  const db = getFirestore();
  await db.runTransaction((tx) => requireAdmin(tx, db, request.auth));
  const ref = db.collection(`admin_tasks/${requireDocumentId(request.data?.taskId)}/history`);
  let query = ref.orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(20);
  if (request.data?.cursor) {
    const cursor = await ref.doc(requireDocumentId(request.data.cursor)).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }
  const page = await query.get();
  return {items: page.docs.map((doc) => ({id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.().toISOString() || null})), cursor: page.docs.at(-1)?.id || null, hasMore: page.size === 20};
}
async function getAdminAffectedAppointments(request) {
  const db = getFirestore();
  await db.runTransaction((tx) => requireAdmin(tx, db, request.auth));
  const therapistId = requireDocumentId(request.data?.therapistId);
  let query = db.collection("citas").where("terapeutaId", "==", therapistId).where("estado", "in", ["pendiente", "confirmada"])
      .where("startAt", ">", Timestamp.now()).orderBy("startAt").orderBy(FieldPath.documentId()).limit(20);
  if (request.data?.cursor) {
    const cursor = await db.doc(`citas/${requireDocumentId(request.data.cursor)}`).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }
  const page = await query.get();
  return {items: page.docs.map((doc) => {
    const a = doc.data(); return {id: doc.id, patientUid: a.pacienteUid, version: a.version, status: a.estado,
      startAtIso: a.startAt.toDate().toISOString(), paymentStatus: a.paymentStatus};
  }), cursor: page.docs.at(-1)?.id || null, hasMore: page.size === 20};
}
async function reopenDueChecklist(db) {
  const due = await db.collection("admin_tasks").where("kind", "==", "checklist").where("status", "==", "resolved").where("reviewAt", "<=", Timestamp.now()).limit(20).get();
  for (const doc of due.docs) {
    await db.runTransaction(async (tx) => {
      const task = (await tx.get(doc.ref)).data();
      if (task.status !== "resolved" || task.reviewAt?.toMillis() > Date.now()) return;
      tx.update(doc.ref, {status: "open", resolvedAt: null, version: task.version + 1, updatedAt: FieldValue.serverTimestamp()});
      tx.create(doc.ref.collection("history").doc(), {actorUid: "system:operations", action: "review_due", note: "Corresponde una nueva revisión periódica.", createdAt: FieldValue.serverTimestamp()});
    });
  }
}
module.exports = {taskId, putTask, operationalException, syncSource, bootstrapTasks, ensureChecklist, reopenDueChecklist,
  getAdminOperationsOverview, updateAdminTask, getAdminTaskHistory, getAdminAffectedAppointments};
