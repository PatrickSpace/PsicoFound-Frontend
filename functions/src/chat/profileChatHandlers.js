const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {HttpsError} = require("firebase-functions/v2/https");
const {askGemini} = require("../ai/geminiClient");
const {getRecentHistory} = require("./history");
const {
  createChatSession,
  getActiveChatSession,
} = require("./session");
const {
  finalizeProfileForMatching,
  getNextProfileQuestion,
  getCurrentProfile,
  sanitizeProfileData,
} = require("../profiles/profile");
const {getCrisisResult} = require("../safety/suicideRisk");
const {
  normalizeMessage,
  normalizeReply,
} = require("../utils/text");

async function sendProfileChatMessage(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const uid = request.auth.uid;
  const message = normalizeMessage(request.data && request.data.message);

  if (!message) {
    throw new HttpsError(
        "invalid-argument",
        "El mensaje no puede estar vacio.",
    );
  }

  if (message.length > 1200) {
    throw new HttpsError(
        "invalid-argument",
        "El mensaje es demasiado largo.",
    );
  }

  const db = admin.firestore();
  const conversationRef = db.collection("conversations").doc(uid);
  const messagesRef = conversationRef.collection("messages");
  const profileRef = db.collection("profiles").doc(uid);
  const conversationSnap = await conversationRef.get();
  const conversationData = conversationSnap.data() || {};
  const chatSession = getActiveChatSession(conversationSnap.data());

  await conversationRef.set(
      {
        uid,
        type: "profile-survey",
        activeSessionId: chatSession.id,
        sessionStartedAt: chatSession.startedAt,
        sessionExpiresAt: chatSession.expiresAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );

  await messagesRef.add({
    sessionId: chatSession.id,
    role: "user",
    text: message,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const currentProfile = await getCurrentProfile(profileRef);
  const profileHadData = hasProfileSignal(currentProfile);
  const crisisResult = getCrisisResult(message);
  let cleanData;
  let reply;

  if (crisisResult) {
    cleanData = sanitizeProfileData(crisisResult.data);
    reply = crisisResult.reply;
  } else {
    const history = await getRecentHistory(messagesRef, chatSession.id);
    const geminiResult = await askGemini({currentProfile, history});
    cleanData = sanitizeProfileData(geminiResult.data);
    reply = normalizeReply(geminiResult.reply);
  }

  const mergedProfile = finalizeProfileForMatching({
    ...currentProfile,
    ...cleanData,
  });
  const initialReplyLooksReady = replyLooksReady(reply);

  if (!mergedProfile.completado && initialReplyLooksReady) {
    const nextQuestion = getNextProfileQuestion(mergedProfile);

    if (nextQuestion) {
      reply = [
        "Tengo casi todo para buscar un profesional para ti.",
        nextQuestion,
      ].join(" ");
    }
  }

  cleanData = {
    ...cleanData,
    completado: mergedProfile.completado,
  };

  logger.info("profile chat result", {
    uidHash: uid.slice(-6),
    completado: mergedProfile.completado,
    replyLooksReady: initialReplyLooksReady,
    cleanDataKeys: Object.keys(cleanData),
    profileState: getProfileStateForLogs(mergedProfile),
  });

  await profileRef.set(
      {
        ...mergedProfile,
        uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );

  await messagesRef.add({
    sessionId: chatSession.id,
    role: "assistant",
    text: reply,
    data: cleanData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await conversationRef.set(
      {
        lastMessage: reply,
        activeSessionId: chatSession.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );

  if (!conversationData.startedEventCreatedAt) {
    await appendLongitudinalEvent(db, uid, {
      eventType: "interview_started",
      sourceType: "profile_chat",
      sourceId: chatSession.id,
      title: "Entrevista inicial iniciada",
      summary: [
        "El paciente inició la entrevista conversacional",
        "de descubrimiento.",
      ].join(" "),
      metadata: {
        sessionId: chatSession.id,
      },
    });

    await conversationRef.set(
        {
          startedEventCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
    );
  }

  if (!currentProfile.completado && mergedProfile.completado) {
    await appendLongitudinalEvent(db, uid, {
      eventType: "initial_profile_completed",
      sourceType: "profile",
      sourceId: uid,
      title: "Perfil psicológico inicial listo",
      summary: [
        "La entrevista reunió información suficiente",
        "para buscar psicólogos recomendados.",
      ].join(" "),
      metadata: buildProfileEventMetadata(mergedProfile),
    });
  } else if (!profileHadData && hasProfileSignal(mergedProfile)) {
    await appendLongitudinalEvent(db, uid, {
      eventType: "initial_profile_updated",
      sourceType: "profile",
      sourceId: uid,
      title: "Perfil inicial actualizado",
      summary: [
        "Se registró nueva información relevante",
        "para orientar el proceso terapéutico.",
      ].join(" "),
      metadata: buildProfileEventMetadata(mergedProfile),
    });
  }

  if (crisisResult && !currentProfile.riesgoSuicida) {
    await appendLongitudinalEvent(db, uid, {
      eventType: "risk_alert_detected",
      sourceType: "profile_chat",
      sourceId: chatSession.id,
      title: "Alerta de riesgo detectada",
      summary: [
        "La plataforma mostró orientación de ayuda urgente.",
        "Este evento no constituye diagnóstico.",
      ].join(" "),
      metadata: {
        sessionId: chatSession.id,
        riskFlag: "suicide_risk",
      },
      visibility: "patient",
    });
  }

  return {
    reply,
    data: cleanData,
    profile: mergedProfile,
    readyForRecommendations: mergedProfile.completado,
  };
}

async function resetProfileChatConversation(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();
  const conversationRef = db.collection("conversations").doc(uid);
  const chatSession = createChatSession();

  await conversationRef.set(
      {
        uid,
        type: "profile-survey",
        activeSessionId: chatSession.id,
        sessionStartedAt: chatSession.startedAt,
        sessionExpiresAt: chatSession.expiresAt,
        lastMessage: "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );

  return {
    activeSessionId: chatSession.id,
  };
}

function replyLooksReady(reply) {
  const normalized = (reply || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  return (
    normalized.includes("puedo buscar") ||
    normalized.includes("podemos buscar") ||
    normalized.includes("buscar un profesional") ||
    normalized.includes("buscar profesionales") ||
    normalized.includes("profesionales que se ajusten") ||
    normalized.includes("con esta informacion") ||
    normalized.includes("psicologos recomendados") ||
    normalized.includes("profesional para ti")
  );
}

function getProfileStateForLogs(profile = {}) {
  return {
    riesgoSuicida: Boolean(profile.riesgoSuicida),
    soloConversar: Boolean(profile.soloConversar),
    temasCount: Array.isArray(profile.temas) ? profile.temas.length : 0,
    hasModalidad: hasValue(profile.modalidad),
    hasPreferenciaGenero: hasValue(profile.preferenciaGenero),
    hasEnfoque: hasValue(profile.enfoque),
    hasPreferenciaEdad: hasValue(profile.preferenciaEdad),
    modalidad: sanitizeLogValue(profile.modalidad),
    preferenciaGenero: sanitizeLogValue(profile.preferenciaGenero),
    enfoque: sanitizeLogValue(profile.enfoque),
    preferenciaEdad: sanitizeLogValue(profile.preferenciaEdad),
  };
}

function hasValue(value) {
  return (value || "").toString().trim().length > 0;
}

function sanitizeLogValue(value) {
  const cleanValue = (value || "").toString().trim();
  return cleanValue.length > 40 ? `${cleanValue.slice(0, 40)}...` : cleanValue;
}

async function appendLongitudinalEvent(db, uid, event = {}) {
  await db.collection("longitudinal_history").add({
    pacienteUid: uid,
    eventType: event.eventType || "profile_event",
    sourceType: event.sourceType || "profile",
    sourceId: event.sourceId || uid,
    terapiaId: "",
    title: event.title || "Evento de perfil",
    summary: event.summary || "",
    metadata: event.metadata || {},
    visibility: event.visibility || "patient",
    createdBy: "system",
    occurredAt: new Date().toISOString(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function hasProfileSignal(profile = {}) {
  return Boolean(
      profile.motivoConsulta ||
      profile.nivelMalestar ||
      profile.urgencia ||
      profile.modalidad ||
      profile.preferenciaGenero ||
      profile.preferenciaEdad ||
      profile.enfoque ||
      profile.soloConversar ||
      profile.riesgoSuicida ||
      (Array.isArray(profile.temas) && profile.temas.length > 0),
  );
}

function buildProfileEventMetadata(profile = {}) {
  return {
    completado: Boolean(profile.completado),
    riesgoSuicida: Boolean(profile.riesgoSuicida),
    soloConversar: Boolean(profile.soloConversar),
    temas: Array.isArray(profile.temas) ? profile.temas.slice(0, 8) : [],
    modalidad: profile.modalidad || "",
    preferenciaGenero: profile.preferenciaGenero || "",
    preferenciaEdad: profile.preferenciaEdad || "",
    enfoque: profile.enfoque || "",
    nivelMalestar: profile.nivelMalestar || "",
    urgencia: profile.urgencia || "",
  };
}

module.exports = {
  resetProfileChatConversation,
  sendProfileChatMessage,
};
