/* eslint-disable max-len */
const firestoreAdmin = require("firebase-admin/firestore");
const {FieldValue, Timestamp} = require("firebase-admin/firestore");
const {randomUUID} = require("node:crypto");
const {HttpsError} = require("firebase-functions/v2/https");
const {requirePatientAccess} = require("../accounts/accessPolicy");
const {aiService} = require("../ai/AIService");
const {buildProfileChatMessages} = require("../ai/profilePrompt");
const {buildProfileChatResponseSchema} = require("../ai/responseSchemas");
const {PROFILE_DEFAULTS, finalizeProfileForMatching, sanitizeModelProfileData} = require("../profiles/profile");
const {createSurveyService} = require("./surveyService");
const {makeTurn, validateTurn} = require("./surveyTurn");
const {assertProviderApproved} = require("../ai/providerPolicy");

async function startProfileChatConversation(request) {
  await requirePatientAccess(request);
  const db = firestoreAdmin.getFirestore();
  const uid = request.auth.uid;
  return db.runTransaction(async (tx) => {
    const conversationRef = db.doc(`conversations/${uid}`);
    const profileRef = db.doc(`profiles/${uid}`);
    const conversation = (await tx.get(conversationRef)).data() || {};
    const saved = (await tx.get(profileRef)).data() || {};
    const sessionId = conversation.activeSessionId || randomUUID();
    const profile = finalizeProfileForMatching({...PROFILE_DEFAULTS,
      ...sanitizeModelProfileData(saved), riesgoSuicida: false,
      summaryConfirmed: Boolean(saved.summaryConfirmed), sessionId});
    const previousTurn = conversation.activeTurn;
    const nextTurn = makeTurn(profile, sessionId);
    const activeTurn = previousTurn?.sessionId === sessionId &&
      (previousTurn.kind === "overwrite_confirmation" ||
        previousTurn.field === nextTurn.field ||
        (previousTurn.kind === "confirmation" && nextTurn.field === "temas")) &&
      previousTurn.status === "active" ?
      previousTurn : nextTurn;
    tx.set(profileRef, {...profile, uid, updatedAt: FieldValue.serverTimestamp()}, {merge: true});
    tx.set(conversationRef, {uid, activeSessionId: sessionId, activeTurn,
      ...(!conversation.activeSessionId ? {sessionStartedAt: Timestamp.now()} : {}),
      updatedAt: FieldValue.serverTimestamp()}, {merge: true});
    if (!conversation.activeSessionId) {
      tx.create(conversationRef.collection("messages")
          .doc(`assistant_start_${sessionId}`), {
        role: "assistant", text: activeTurn.question, sessionId,
        requestId: `start_${sessionId}`, turnId: activeTurn.id,
        suggestedOptions: activeTurn.options,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    return {profile, activeTurn, sessionId};
  });
}

async function sendProfileChatMessage(request) {
  await requirePatientAccess(request);
  return createSurveyService({db: firestoreAdmin.getFirestore(), generate: getProfileChatAIResult})
      .send(request.auth.uid, request.data || {});
}
async function getProfileChatAIResult(input) {
  assertProviderApproved();
  const result = await aiService.generateStructuredOutput({
    messages: buildProfileChatMessages(input), schema: buildProfileChatResponseSchema(),
    allowFallback: false, temperature: 0.2, maxTokens: 700, metadata: {task: "profile-chat"},
  });
  return result.data || {};
}
async function updateProfilePreferences(request) {
  await requirePatientAccess(request);
  const requested = request.data?.profile;
  const allowed = new Set(["motivoConsulta", "soloConversar", "temas", "enfoque", "preferenciaEdad", "preferenciaGenero", "modalidad", "disponibilidad", "presupuesto", "ciudad", "observaciones"]);
  if (!requested || typeof requested !== "object" || Array.isArray(requested) || Object.keys(requested).some((key) => !allowed.has(key))) {
    throw new HttpsError("invalid-argument", "Revisa los campos editables del perfil.");
  }
  const db = firestoreAdmin.getFirestore(); const uid = request.auth.uid;
  return db.runTransaction(async (tx) => {
    const conversationRef = db.doc(`conversations/${uid}`); const profileRef = db.doc(`profiles/${uid}`);
    const conversation = (await tx.get(conversationRef)).data() || {};
    const saved = (await tx.get(profileRef)).data() || {};
    validateTurn(request.data, conversation);
    const sessionId = conversation.activeSessionId || randomUUID();
    const profile = finalizeProfileForMatching({...PROFILE_DEFAULTS, ...saved,
      ...sanitizeModelProfileData(requested), riesgoSuicida: false,
      summaryConfirmed: false, sessionId});
    const activeTurn = makeTurn(profile, sessionId);
    tx.set(profileRef, {...profile, uid, updatedAt: FieldValue.serverTimestamp()});
    tx.set(conversationRef, {uid, activeSessionId: sessionId, activeTurn, updatedAt: FieldValue.serverTimestamp()}, {merge: true});
    tx.set(db.doc(`survey_summaries/${uid}`), {uid, sessionId,
      confirmed: false, updatedAt: FieldValue.serverTimestamp()}, {merge: true});
    tx.create(db.collection("longitudinal_history").doc(), {pacienteUid: uid,
      eventType: "initial_profile_corrected", sourceType: "profile", sourceId: uid, terapiaId: "",
      title: "Preferencias de búsqueda corregidas", summary: "El paciente corrigió sus preferencias.",
      metadata: {changedFields: Object.keys(requested)}, visibility: "patient", createdBy: uid,
      occurredAt: new Date().toISOString(), createdAt: FieldValue.serverTimestamp()});
    return {profile, activeTurn, sessionId};
  });
}
async function confirmProfileSummary(request) {
  await requirePatientAccess(request);
  const uid = request.auth.uid;
  const db = firestoreAdmin.getFirestore();
  return db.runTransaction(async (tx) => {
    const profileRef = db.doc(`profiles/${uid}`);
    const conversationRef = db.doc(`conversations/${uid}`);
    const [profileSnap, conversationSnap] = await Promise.all([
      tx.get(profileRef), tx.get(conversationRef),
    ]);
    const conversation = conversationSnap.data() || {};
    const saved = profileSnap.data() || {};
    if (request.data?.sessionId &&
        request.data.sessionId !== conversation.activeSessionId) {
      throw new HttpsError("aborted", "La sesión cambió. Revisa el resumen actual.");
    }
    const profile = finalizeProfileForMatching({...PROFILE_DEFAULTS,
      ...sanitizeModelProfileData(saved), riesgoSuicida: false,
      summaryConfirmed: true, sessionId: conversation.activeSessionId || saved.sessionId});
    if (!profile.completado) {
      throw new HttpsError("failed-precondition", "Completa las respuestas pendientes antes de confirmar el resumen.");
    }
    const summary = buildApprovedSummary(profile);
    const stamp = FieldValue.serverTimestamp();
    tx.set(profileRef, {...profile, uid, updatedAt: stamp});
    tx.set(db.doc(`survey_summaries/${uid}`), {uid,
      sessionId: profile.sessionId, confirmed: true, summary,
      confirmedAt: stamp, updatedAt: stamp});
    tx.set(conversationRef, {summaryConfirmed: true, updatedAt: stamp}, {merge: true});
    return {profile, summary, sessionId: profile.sessionId,
      readyForRecommendations: true};
  });
}

function buildApprovedSummary(profile) {
  return {
    motivoConsulta: profile.motivoConsulta || "",
    soloConversar: Boolean(profile.soloConversar),
    temas: Array.isArray(profile.temas) ? profile.temas : [],
    modalidad: profile.modalidad || "",
    preferenciaGenero: profile.preferenciaGenero || "",
    preferenciaEdad: profile.preferenciaEdad || "",
    enfoque: profile.enfoque || "",
  };
}
async function resetProfileChatConversation(request) {
  await requirePatientAccess(request);
  const uid = request.auth.uid; const db = firestoreAdmin.getFirestore();
  const requestId = request.data?.requestId || randomUUID();
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(requestId)) throw new HttpsError("invalid-argument", "Identificador de reinicio inválido.");
  return db.runTransaction(async (tx) => {
    const conversationRef = db.doc(`conversations/${uid}`); const operationRef = db.doc(`profile_chat_operations/${uid}_reset_${requestId}`);
    const previous = (await tx.get(operationRef)).data();
    const conversation = (await tx.get(conversationRef)).data() || {};
    if (previous) {
      if (previous.result.activeSessionId !== conversation.activeSessionId) throw new HttpsError("aborted", "El reinicio pertenece a una sesión anterior.");
      return previous.result;
    }
    const sessionId = randomUUID(); const profile = {...PROFILE_DEFAULTS, sessionId};
    const activeTurn = makeTurn(profile, sessionId); const now = FieldValue.serverTimestamp();
    tx.set(conversationRef, {uid, type: "profile-survey", activeSessionId: sessionId,
      sessionStartedAt: Timestamp.now(), activeTurn, lastMessage: "", updatedAt: now});
    tx.set(db.doc(`profiles/${uid}`), {...profile, uid, updatedAt: now});
    tx.set(db.doc(`survey_summaries/${uid}`), {uid, sessionId,
      confirmed: false, updatedAt: now});
    tx.create(conversationRef.collection("messages")
        .doc(`assistant_start_${sessionId}`), {
      role: "assistant", text: activeTurn.question, sessionId,
      requestId: `start_${sessionId}`, turnId: activeTurn.id,
      suggestedOptions: activeTurn.options, createdAt: now,
    });
    const result = {activeSessionId: sessionId, activeTurn};
    tx.create(operationRef, {uid, type: "reset", status: "completed", result, createdAt: now});
    return result;
  });
}
module.exports = {buildApprovedSummary, confirmProfileSummary,
  startProfileChatConversation, sendProfileChatMessage,
  updateProfilePreferences, resetProfileChatConversation};
