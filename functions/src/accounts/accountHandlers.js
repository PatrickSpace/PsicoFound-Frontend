const {surveyInputMode} = require("../chat/surveyPolicy");
/* eslint-disable max-len */
const firestoreAdmin = require("firebase-admin/firestore");
const authAdmin = require("firebase-admin/auth");
const {FieldValue} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {assertEligible, evaluateAccess, readLegalPolicy} = require("./accessPolicy");
const {sanitizeLegalAcceptance} = require("../onboarding/registrationHandlers");
const {suspendOwnAccount, reactivateOwnAccount} = require("./accountLifecycle");

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  return request.auth;
}

function text(value, max, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if ((required && !result) || result.length > max) {
    throw new HttpsError("invalid-argument", "Revisa los datos ingresados.");
  }
  return result;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10);
}

function validTimeZone(value) {
  try {
    new Intl.DateTimeFormat("es-PE", {timeZone: value}).format();
    return true;
  } catch (error) {
    return false;
  }
}

async function updateOwnProfile(request) {
  const auth = requireAuth(request);
  const data = request.data || {};
  const nombre = text(data.nombre, 120, true);
  const fechaNacimiento = text(data.fechaNacimiento, 10, true);
  const telefono = text(data.telefono, 40);
  const pais = text(data.pais, 80, true);
  const zonaHoraria = data.zonaHoraria === undefined ?
    undefined : text(data.zonaHoraria, 80, true);
  if (!validDate(fechaNacimiento) ||
      (zonaHoraria !== undefined && !validTimeZone(zonaHoraria))) {
    throw new HttpsError(
        "invalid-argument",
        "Revisa la fecha de nacimiento y la zona horaria.",
    );
  }
  const payload = {
    nombre,
    fechaNacimiento,
    telefono,
    pais,
    ...(zonaHoraria === undefined ? {} : {zonaHoraria}),
    updatedAt: FieldValue.serverTimestamp(),
  };
  assertEligible(fechaNacimiento);
  await firestoreAdmin.getFirestore().doc(`users/${auth.uid}`).update(payload);
  return {...payload, updatedAt: new Date().toISOString()};
}

async function documentsForQuery(query) {
  const snapshot = await query.get();
  return snapshot.docs.map((item) => ({id: item.id, ...item.data()}));
}

async function exportOwnData(request) {
  const auth = requireAuth(request);
  const db = firestoreAdmin.getFirestore();
  const uid = auth.uid;
  const userSnapshot = await db.doc(`users/${uid}`).get();
  if (!userSnapshot.exists) {
    throw new HttpsError("not-found", "No encontramos tu perfil de usuario.");
  }
  const conversationSnapshot = await db.doc(`conversations/${uid}`).get();
  const profileSnapshot = await db.doc(`profiles/${uid}`).get();
  const surveySummarySnapshot = await db.doc(`survey_summaries/${uid}`).get();
  const queries = {
    therapies: db.collection("terapias").where("pacienteUid", "==", uid),
    appointments: db.collection("citas").where("pacienteUid", "==", uid),
    goals: db.collection("therapy_goals").where("pacienteUid", "==", uid),
    exercises: db.collection("exercises").where("pacienteUid", "==", uid),
    emotions: db.collection("emotional_checkins")
        .where("pacienteUid", "==", uid),
    history: db.collection("longitudinal_history")
        .where("pacienteUid", "==", uid),
    notifications: db.collection("notifications")
        .where("recipientUid", "==", uid),
    feedback: db.collection("feddback").where("userId", "==", uid),
    feedbackCurrent: db.collection("feedback").where("userId", "==", uid),
    support: db.collection("support_requests").where("requesterUid", "==", uid),
    payments: db.collection("payment_operations")
        .where("patientUid", "==", uid),
    administrativeHistory: db.collection("admin_audit").where("targetUid", "==", uid),
    accountRequests: db.collection("account_requests").where("requesterUid", "==", uid),
    professionalApplications: db.collection("psychologist_requests").where("userUid", "==", uid),
    professionalProfiles: db.collection("therapists").where("uid", "==", uid),
    appointmentOperations: db.collection("appointment_operations").where("actorUid", "==", uid),
    chatOperations: db.collection("profile_chat_operations").where("uid", "==", uid),
  };
  const entries = await Promise.all(Object.entries(queries).map(
      async ([key, query]) => [key, await documentsForQuery(query)],
  ));
  const messages = await documentsForQuery(
      db.collection(`conversations/${uid}/messages`),
  );
  const surveySafetyEvents = await documentsForQuery(
      db.collection(`conversations/${uid}/safety_events`),
  );
  const data = Object.fromEntries(entries);
  // Only goals selected by patient ownership; never follow a client supplied ID.
  for (const goal of data.goals) {
    goal.progress = await documentsForQuery(db.collection(`therapy_goals/${goal.id}/progress`));
  }
  data.professionalFinancials = [];
  for (const profile of data.professionalProfiles) {
    profile.rateHistory = await documentsForQuery(db.collection(`therapists/${profile.id}/rate_history`));
    const obligations = await documentsForQuery(db.collection("professional_obligations").where("therapistId", "==", profile.id));
    const transfers = await documentsForQuery(db.collection("professional_transfers").where("therapistId", "==", profile.id));
    data.professionalFinancials.push({therapistId: profile.id,
      obligations: obligations.map(({patientUid, ...entry}) => entry),
      transfers: transfers.map(({recordedBy, ...entry}) => entry)});
  }
  const consents = await documentsForQuery(db.collection(`users/${uid}/consents`));
  const authUser = await authAdmin.getAuth().getUser(uid);
  // Credentials, token claims and provider tokens are never exported.
  const authentication = {uid, email: authUser.email || "", emailVerified: authUser.emailVerified,
    displayName: authUser.displayName || "", disabled: authUser.disabled,
    providers: authUser.providerData.map((item) => item.providerId),
    creationTime: authUser.metadata.creationTime, lastSignInTime: authUser.metadata.lastSignInTime || null};
  data.payments = data.payments.map(({reconciliationNote, reconciledBy, ...payment}) => payment);
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    scope: {
      includes: [
        "perfil de cuenta",
        "perfil de búsqueda y conversación",
        "terapias y citas propias",
        "seguimiento personal",
        "notificaciones, soporte y pagos propios",
      ],
      excludes: [
        "notas privadas del profesional",
        "datos de otras personas",
        "documentos internos de conciliación",
      ],
    },
    data: {
      user: {id: userSnapshot.id, ...userSnapshot.data()},
      profile: profileSnapshot.exists ? profileSnapshot.data() : null,
      conversation: conversationSnapshot.exists ?
        conversationSnapshot.data() : null,
      messages,
      surveySafetyEvents,
      surveySummary: surveySummarySnapshot.exists ?
        surveySummarySnapshot.data() : null,
      authentication,
      consents,
      ...data,
    },
  };
}

async function getAccountAccessStatus(request) {
  const auth = requireAuth(request);
  const user = (await firestoreAdmin.getFirestore().doc(`users/${auth.uid}`).get()).data();
  return {...evaluateAccess(user, auth, await readLegalPolicy()),
    survey: {inputMode: surveyInputMode()}};
}

async function acceptCurrentConsent(request) {
  const auth = requireAuth(request);
  const db = firestoreAdmin.getFirestore();
  const userRef = db.doc(`users/${auth.uid}`);
  const result = await db.runTransaction(async (transaction) => {
    const policy = await readLegalPolicy(transaction, db);
    const acceptance = sanitizeLegalAcceptance(request.data, FieldValue.serverTimestamp(), policy);
    const user = await transaction.get(userRef);
    if (!user.exists) throw new HttpsError("failed-precondition", "Completa primero el registro.");
    const ref = userRef.collection("consents").doc(acceptance.version);
    const prior = await transaction.get(ref);
    if (prior.exists && ["termsUrl", "privacyUrl"].some((key) => prior.data()[key] !== acceptance[key])) {
      throw new HttpsError("failed-precondition", "Los documentos cambiaron sin cambiar su versión. Contacta a soporte.");
    }
    const value = prior.exists ? prior.data() : acceptance;
    transaction.update(userRef, {legalAcceptance: value, updatedAt: FieldValue.serverTimestamp()});
    if (!prior.exists) transaction.create(ref, value);
    return {status: "accepted", version: policy.version};
  });
  return result;
}

async function syncOwnAuthEmail(request) {
  const auth = requireAuth(request);
  const current = await authAdmin.getAuth().getUser(auth.uid);
  if (!current.emailVerified || current.email !== auth.token?.email || auth.token?.email_verified !== true) {
    throw new HttpsError("failed-precondition", "Actualiza tu sesión después de verificar el nuevo correo.");
  }
  // Auth is authoritative. No client-provided email can update the profile.
  await firestoreAdmin.getFirestore().doc(`users/${auth.uid}`).update({
    email: current.email, updatedAt: FieldValue.serverTimestamp(),
  });
  return {email: current.email};
}

async function requestAccountDeletion(request) {
  const auth = requireAuth(request);
  const data = request.data || {};
  if (data.confirmation !== "ELIMINAR MI CUENTA") {
    throw new HttpsError(
        "invalid-argument",
        "Escribe ELIMINAR MI CUENTA para confirmar la solicitud.",
    );
  }
  const db = firestoreAdmin.getFirestore();
  const ref = db.doc(`account_requests/${auth.uid}_deletion`);
  const snapshot = await ref.get();
  const existing = snapshot.data();
  if (existing && [
    "pending_policy",
    "pending",
    "in_review",
  ].includes(existing.status)) {
    return {id: ref.id, status: existing.status, scope: existing.scope};
  }
  const scope = {
    authentication: "Eliminar acceso de Firebase Authentication",
    privateData: "Eliminar perfil, encuesta y conversación privada",
    personalRecords:
      "Eliminar o anonimizar seguimiento exclusivamente personal",
    sharedRecords:
      "Revisar conservación o anonimización de terapias, citas, pagos " +
      "e historial compartido",
  };
  await ref.set({
    requesterUid: auth.uid,
    type: "account_deletion",
    status: "pending_policy",
    scope,
    policyDependency:
      "Falta aprobar retención y anonimización de registros compartidos.",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return {id: ref.id, status: "pending_policy", scope};
}

module.exports = {
  getAccountAccessStatus,
  acceptCurrentConsent,
  syncOwnAuthEmail,
  exportOwnData,
  requestAccountDeletion,
  suspendOwnAccount,
  reactivateOwnAccount,
  updateOwnProfile,
  validDate,
  validTimeZone,
};
