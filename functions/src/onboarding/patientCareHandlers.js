/* eslint-disable max-len */
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {requirePatientAccess, evaluateAccess, readLegalPolicy, requirePatientRole} = require("../accounts/accessPolicy");
const {agendaDate} = require("../appointments/schedulePolicy.mjs");
const sections = ["sesiones", "inicio", "emociones", "progreso", "herramientas", "historial"];
const validId = (id) => typeof id === "string" && /^[\w-]{1,128}$/.test(id);

// Eligibility belongs to the server; tutorial progress never grants therapy access.
async function context(tx, db, request) {
  const uid = request.auth.uid;
  const userRef = db.doc(`users/${uid}`);
  const user = (await tx.get(userRef)).data();
  requirePatientRole(user);
  if (!evaluateAccess(user, request.auth, await readLegalPolicy(tx, db)).allowed) {
    throw new HttpsError("permission-denied", "Revisa los requisitos de tu cuenta.");
  }
  const appointments = await tx.get(db.collection("citas").where("pacienteUid", "==", uid));
  const therapies = await tx.get(db.collection("terapias").where("pacienteUid", "==", uid));
  const active = new Map(therapies.docs.filter((doc) => doc.data().estado === "activo").map((doc) => [doc.id, doc.data()]));
  const candidates = appointments.docs.map((doc) => ({...doc.data(), id: doc.id})).filter((item) =>
    ["confirmada", "realizada"].includes(item.estado) && item.paymentStatus === "confirmed" &&
    active.get(item.terapiaId)?.terapeutaId === item.terapeutaId && validId(item.paymentOperationId));
  const paid = [];
  for (const appointment of candidates) {
    const payment = (await tx.get(db.doc(`payment_operations/${appointment.paymentOperationId}`))).data();
    if (payment?.status === "confirmed" && payment.patientUid === uid &&
        payment.appointmentId === appointment.id && payment.therapistId === appointment.terapeutaId) paid.push(appointment);
  }
  const today = agendaDate(new Date());
  const upcoming = paid.filter((item) => item.estado === "confirmada" && item.fecha >= today &&
    (!item.startAtIso || Date.parse(item.startAtIso) > Date.now()))
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))[0];
  const progress = user.productGuides?.patientCare || null;
  return {userRef, progress, available: paid.length > 0 || progress?.version === 1, welcomeEligible: Boolean(upcoming),
    appointment: upcoming ? {id: upcoming.id, hasMeetingLink: Boolean(upcoming.meetingUrl), remote: String(upcoming.modalidad || "").toLowerCase() === "remoto"} : null};
}
async function getPatientCareGuide(request) {
  await requirePatientAccess(request);
  const db = getFirestore();
  return db.runTransaction(async (tx) => {
    const {available, welcomeEligible, appointment, progress} = await context(tx, db, request);
    return {available, welcomeEligible, appointment, progress};
  });
}
async function savePatientCareGuide(request) {
  await requirePatientAccess(request);
  const data = request.data || {};
  const {kind, step, status, section} = data;
  if (!Object.keys(data).every((key) => ["kind", "step", "status", "section"].includes(key)) ||
      !(kind === "walkthrough" && Number.isInteger(step) && step >= 0 && step <= 2 && ["started", "dismissed", "completed"].includes(status) ||
      kind === "section" && sections.includes(section) && ["seen", "deferred"].includes(status) ||
      kind === "exercise" && status === "seen")) throw new HttpsError("invalid-argument", "Avance de guía no válido.");
  const db = getFirestore();
  return db.runTransaction(async (tx) => {
    const state = await context(tx, db, request);
    if (!state.available) throw new HttpsError("failed-precondition", "La guía estará disponible cuando se confirmen tu pago y tu cita.");
    const patch = {"productGuides.patientCare.version": 1, "productGuides.patientCare.updatedAt": FieldValue.serverTimestamp()};
    if (kind === "walkthrough") Object.assign(patch, {"productGuides.patientCare.step": step, "productGuides.patientCare.status": status});
    if (kind === "section") patch[`productGuides.patientCare.sections.${section}`] = status;
    if (kind === "exercise") patch["productGuides.patientCare.firstExerciseSeen"] = true;
    tx.update(state.userRef, patch);
    return {ok: true};
  });
}
module.exports = {getPatientCareGuide, savePatientCareGuide};
