/* eslint-disable max-len */
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {setupState} = require("./professionalSetup");

function hasGuideRole(user, role) {
  const aliases = {psychologist: ["psychologist", "psicologo", "psicólogo", "psicóloga"],
    patient: ["patient", "paciente"], admin: ["admin", "psicofound-admin"]};
  return [...(Array.isArray(user.roles) ? user.roles : []), user.rol, user.role].some((value) =>
    typeof value === "string" && aliases[role].includes(value.trim().toLowerCase()));
}

async function professionalContext(reader, db, request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Inicia sesión para preparar tu consulta.");
  const user = (await reader.get(db.doc(`users/${uid}`))).data() || {};
  if (!hasGuideRole(user, "psychologist") || user.accountStatus === "suspended") {
    throw new HttpsError("permission-denied", "Necesitas un perfil profesional habilitado y una cuenta activa.");
  }
  const profiles = await reader.get(db.collection("therapists").where("uid", "==", uid).limit(2));
  if (profiles.size !== 1 || profiles.docs[0].data().activo === false) {
    throw new HttpsError("permission-denied", "Tu perfil profesional requiere revisión administrativa. Contacta con soporte.");
  }
  const profile = profiles.docs[0].data();
  const rate = profile.paymentRateId ? (await reader.get(db.doc(`payment_rates/${profile.paymentRateId}`))).data() : null;
  const slots = await reader.get(db.collection("therapist_availability").where("therapistId", "==", profiles.docs[0].id));
  return {ref: profiles.docs[0].ref, profile, user, rate, slots: slots.docs.map((item) => item.data())};
}

async function getProfessionalSetup(request) {
  const db = getFirestore();
  return db.runTransaction(async (tx) => {
    if (request.data?.therapistId) {
      const caller = request.auth?.uid;
      if (!caller) throw new HttpsError("unauthenticated", "Inicia sesión.");
      const admin = (await tx.get(db.doc(`users/${caller}`))).data() || {};
      if (admin.accountStatus === "suspended" || !hasGuideRole(admin, "admin")) {
        throw new HttpsError("permission-denied", "Solo administración puede consultar la preparación de otro profesional.");
      }
      const id = request.data.therapistId;
      if (typeof id !== "string" || !/^[\w-]{1,128}$/.test(id)) throw new HttpsError("invalid-argument", "Profesional no válido.");
      const profile = (await tx.get(db.doc(`therapists/${id}`))).data();
      if (!profile) throw new HttpsError("not-found", "No encontramos el perfil profesional.");
      const rate = profile.paymentRateId ? (await tx.get(db.doc(`payment_rates/${profile.paymentRateId}`))).data() : null;
      const slots = await tx.get(db.collection("therapist_availability").where("therapistId", "==", id));
      const owner = profile.uid ? (await tx.get(db.doc(`users/${profile.uid}`))).data() : null;
      return setupState(profile, rate, slots.docs.map((item) => item.data()), owner || {});
    }
    const context = await professionalContext(tx, db, request);
    return setupState(context.profile, context.rate, context.slots, context.user);
  });
}

async function updateProfessionalSetup(request) {
  const db = getFirestore();
  const {action, expectedVersion, fingerprint, activationFingerprint} = request.data || {};
  if (!["review", "activate", "pause", "dismiss"].includes(action) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw new HttpsError("invalid-argument", "Actualiza la guía y vuelve a intentarlo.");
  }
  return db.runTransaction(async (tx) => {
    const context = await professionalContext(tx, db, request);
    const state = setupState(context.profile, context.rate, context.slots, context.user);
    if (state.version !== expectedVersion) throw new HttpsError("aborted", "La configuración cambió en otra ventana. Actualiza la guía.");
    const patch = {bookingSettingsVersion: state.version + 1, updatedAt: FieldValue.serverTimestamp()};
    if (action === "review") {
      if (!state.profileComplete || fingerprint !== state.profileFingerprint) {
        throw new HttpsError("failed-precondition", "Revisa el perfil actualizado o solicita corregir sus datos esenciales.");
      }
      patch.reviewedProfileFingerprint = fingerprint;
    }
    if (action === "activate") {
      if (activationFingerprint !== state.activationFingerprint) throw new HttpsError("aborted", "La tarifa o los horarios cambiaron. Revisa el resumen actualizado antes de activar.");
      if (!state.canActivate) throw new HttpsError("failed-precondition", "Revisa tu perfil, elige una tarifa real y abre un horario futuro antes de activar reservas.");
      Object.assign(patch, {setupVersion: 1, acceptingBookings: true, setupCompletedAt: context.profile.setupCompletedAt || FieldValue.serverTimestamp()});
    }
    if (action === "pause") patch.acceptingBookings = false;
    if (action === "dismiss") patch.setupWelcomeDismissed = true;
    tx.update(context.ref, patch);
    tx.set(db.collection("professional_setup_events").doc(), {uid: request.auth.uid, therapistId: context.ref.id,
      action, at: FieldValue.serverTimestamp(), version: patch.bookingSettingsVersion});
    return {ok: true};
  });
}

async function saveProductGuide(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const {role, step, status} = request.data || {};
  if (!["psychologist", "patient"].includes(role) || !Number.isInteger(step) || step < 0 || step > (role === "psychologist" ? 3 : 2) ||
      !["started", "dismissed", "completed"].includes(status)) throw new HttpsError("invalid-argument", "La guía no es válida.");
  const db = getFirestore();
  return db.runTransaction(async (tx) => {
    const ref = db.doc(`users/${uid}`);
    const user = (await tx.get(ref)).data();
    if (!user || user.accountStatus === "suspended" || !hasGuideRole(user, role)) {
      throw new HttpsError("permission-denied", "Esta guía no corresponde a tu cuenta activa.");
    }
    tx.update(ref, {[`productGuides.${role}`]: {version: 1, step, status, updatedAt: FieldValue.serverTimestamp()}});
    return {ok: true};
  });
}

module.exports = {getProfessionalSetup, updateProfessionalSetup, saveProductGuide};
