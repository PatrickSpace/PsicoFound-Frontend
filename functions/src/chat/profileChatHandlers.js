const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {HttpsError} = require("firebase-functions/v2/https");
const {aiService} = require("../ai/AIService");
const {buildProfileChatMessages} = require("../ai/profilePrompt");
const {
  buildProfileChatResponseSchema,
} = require("../ai/responseSchemas");
const {
  AIProviderConfigurationError,
  AIProviderRateLimitError,
  AIProviderUnavailableError,
} = require("../ai/errors");
const {getRecentHistory} = require("./history");
const {
  createChatSession,
  getActiveChatSession,
} = require("./session");
const {
  PROFILE_DEFAULTS,
  finalizeProfileForMatching,
  getMissingProfileField,
  getNextProfileQuestion,
  getSuggestedOptionsForProfile,
  getCurrentProfile,
  sanitizeModelProfileData,
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

  const savedProfile = await getCurrentProfile(profileRef);
  let currentProfile = getProfileForActiveSession(
      savedProfile,
      chatSession.id,
  );
  const normalizedMessage = normalizePlainText(message);
  const isLowInformationGreeting = isLowInformationMessage(normalizedMessage);
  const isOpeningLowInformationMessage =
    isLowInformationGreeting &&
    !(await hasSubstantiveUserMessage(messagesRef, chatSession.id));

  if (isOpeningLowInformationMessage) {
    currentProfile = {
      ...PROFILE_DEFAULTS,
      sessionId: chatSession.id,
    };
  }

  const profileHadData = hasProfileSignal(currentProfile);
  const crisisResult = getCrisisResult(message);
  const indifferentPreferenceField = getIndifferentPreferenceField(
      currentProfile,
      normalizedMessage,
  );
  let cleanData;
  let reply;
  let suggestedOptions = [];

  if (isLowInformationGreeting) {
    cleanData = {};
    reply = getNeutralLowInformationReply(currentProfile);
  } else if (crisisResult) {
    cleanData = sanitizeModelProfileData(crisisResult.data);
    reply = crisisResult.reply;
  } else if (indifferentPreferenceField) {
    cleanData = {
      [indifferentPreferenceField]: "indiferente",
    };
    reply = getReplyAfterIndifference({
      ...currentProfile,
      ...cleanData,
    });
  } else {
    const history = await getRecentHistory(messagesRef, chatSession.id);
    const aiResult = await getProfileChatAIResult({
      currentProfile,
      history,
      latestUserMessage: message,
    });
    cleanData = sanitizeModelProfileData(aiResult.data);
    reply = normalizeReply(aiResult.reply);
    suggestedOptions = aiResult.suggestedOptions;
  }

  const validationResult = validateModelProfileData({
    cleanData,
    currentProfile,
    message,
  });
  cleanData = validationResult.cleanData;

  if (validationResult.forceQuestion) {
    reply = getNextProfileQuestion({
      ...currentProfile,
      ...cleanData,
    }) || [
      "Hola, gracias por escribir.",
      "Que te gustaria trabajar o conversar con un terapeuta?",
    ].join(" ");
  }

  const mergedProfile = finalizeProfileForMatching({
    ...currentProfile,
    ...cleanData,
  });
  suggestedOptions = getSafeSuggestedOptions(
      suggestedOptions,
      mergedProfile,
  );
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
        sessionId: chatSession.id,
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
    suggestedOptions,
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
    suggestedOptions,
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
  const profileRef = db.collection("profiles").doc(uid);
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

  await profileRef.set(
      {
        ...PROFILE_DEFAULTS,
        sessionId: chatSession.id,
        uid,
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

function getProfileForActiveSession(profile = {}, sessionId = "") {
  if (!sessionId || profile.sessionId === sessionId) {
    return profile;
  }

  return {
    ...PROFILE_DEFAULTS,
    sessionId,
  };
}

function getNeutralLowInformationReply(currentProfile = {}) {
  const nextQuestion = getNextProfileQuestion(currentProfile);

  if (nextQuestion) {
    return [
      "Hola, gracias por escribir.",
      nextQuestion,
    ].join(" ");
  }

  return [
    "Hola, gracias por escribir.",
    "Para orientarte mejor, cuentame que te trae por aqui",
    "o que tipo de apoyo estas buscando.",
  ].join(" ");
}

async function getProfileChatAIResult({
  currentProfile,
  history,
  latestUserMessage,
}) {
  try {
    const result = await aiService.generateStructuredOutput({
      messages: buildProfileChatMessages({
        currentProfile,
        history,
        latestUserMessage,
      }),
      schema: buildProfileChatResponseSchema(),
      temperature: 0.2,
      maxTokens: 700,
      metadata: {
        task: "profile-chat",
      },
    });

    return normalizeProfileChatAIResult(result.data);
  } catch (error) {
    handleAIServiceError(error);
  }
}

function normalizeProfileChatAIResult(result = {}) {
  if (!result || typeof result !== "object") {
    return {
      reply: "",
      data: {},
      suggestedOptions: [],
    };
  }

  return {
    reply: (result.reply || "").toString(),
    data: result.data && typeof result.data === "object" ? result.data : {},
    suggestedOptions: sanitizeSuggestedOptions(result.suggestedOptions),
  };
}

function getSafeSuggestedOptions(options = [], profile = {}) {
  const sanitizedOptions = sanitizeSuggestedOptions(options);
  const missingField = getMissingProfileField(profile);

  if (
    missingField &&
    sanitizedOptions.length > 0 &&
    sanitizedOptions.every((option) => option.field === missingField)
  ) {
    return sanitizedOptions;
  }

  return getSuggestedOptionsForProfile(profile);
}

function sanitizeSuggestedOptions(options = []) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
      .map((option) => ({
        label: sanitizeOptionText(option && option.label),
        value: sanitizeOptionText(option && option.value),
        field: sanitizeOptionText(option && option.field),
      }))
      .filter((option) => option.label && option.value)
      .slice(0, 7);
}

function sanitizeOptionText(value = "") {
  return (value || "").toString().trim().slice(0, 80);
}

function handleAIServiceError(error) {
  if (error instanceof AIProviderRateLimitError) {
    throw new HttpsError(
        "resource-exhausted",
        "El proveedor de IA no tiene cuota disponible en este momento.",
    );
  }

  if (error instanceof AIProviderUnavailableError) {
    throw new HttpsError(
        "deadline-exceeded",
        "El proveedor de IA tardo demasiado o no esta disponible.",
    );
  }

  if (error instanceof AIProviderConfigurationError) {
    throw new HttpsError(
        "failed-precondition",
        "El proveedor de IA no esta configurado correctamente.",
    );
  }

  throw new HttpsError(
      "internal",
      "No pudimos procesar el mensaje con IA en este momento.",
  );
}

function getIndifferentPreferenceField(profile = {}, normalizedMessage = "") {
  if (!hasIndifferenceSignal(normalizedMessage)) {
    return "";
  }

  if (
    !profile.soloConversar &&
    (!Array.isArray(profile.temas) || profile.temas.length === 0)
  ) {
    return "";
  }

  const fields = profile.soloConversar ?
    ["modalidad", "preferenciaGenero", "preferenciaEdad"] :
    ["modalidad", "preferenciaGenero", "enfoque", "preferenciaEdad"];

  return fields.find((field) => !hasValue(profile[field])) || "";
}

function getReplyAfterIndifference(nextProfile = {}) {
  const nextQuestion = getNextProfileQuestion(nextProfile);

  if (nextQuestion) {
    return [
      "Listo, lo tomo como sin preferencia.",
      nextQuestion,
    ].join(" ");
  }

  return [
    "Listo, ya tengo la informacion necesaria.",
    "Puedes ver los psicologos recomendados cuando quieras.",
  ].join(" ");
}

function validateModelProfileData({
  cleanData = {},
  currentProfile = {},
  message = "",
}) {
  const nextData = {...cleanData};
  const normalizedMessage = normalizePlainText(message);
  const currentHasSignal = hasProfileSignal(currentProfile);

  if (!currentHasSignal && isLowInformationMessage(normalizedMessage)) {
    return {
      cleanData: {},
      forceQuestion: true,
    };
  }

  if (
    nextData.soloConversar === true &&
    !currentProfile.soloConversar &&
    !hasSoloConversationSignal(normalizedMessage)
  ) {
    delete nextData.soloConversar;
  }

  [
    "modalidad",
    "preferenciaGenero",
    "preferenciaEdad",
    "enfoque",
  ].forEach((field) => {
    if (
      isIndifferentValue(nextData[field]) &&
      !hasValue(currentProfile[field]) &&
      !hasIndifferenceSignal(normalizedMessage)
    ) {
      delete nextData[field];
    }
  });

  if (
    Array.isArray(nextData.temas) &&
    nextData.temas.length > 0 &&
    !Array.isArray(currentProfile.temas) &&
    isLowInformationMessage(normalizedMessage)
  ) {
    delete nextData.temas;
  }

  return {
    cleanData: nextData,
    forceQuestion: false,
  };
}

function normalizePlainText(value = "") {
  return (value || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
}

function isLowInformationMessage(normalizedMessage = "") {
  if (!normalizedMessage) {
    return true;
  }

  const words = normalizedMessage.split(" ").filter(Boolean);
  const greetings = new Set([
    "hola",
    "buenas",
    "buenos",
    "dias",
    "tardes",
    "noches",
    "hello",
    "hi",
    "hey",
    "saludos",
  ]);

  return words.length <= 3 && words.every((word) => greetings.has(word));
}

function hasSoloConversationSignal(normalizedMessage = "") {
  return [
    "solo quiero conversar",
    "solo conversar",
    "quiero conversar",
    "quiero hablar",
    "hablar con alguien",
    "desahogarme",
    "ser escuchado",
    "ser escuchada",
    "no tengo un problema especifico",
    "sin problema especifico",
  ].some((signal) => normalizedMessage.includes(signal));
}

function hasIndifferenceSignal(normalizedMessage = "") {
  return [
    "indiferente",
    "me es indiferente",
    "me da igual",
    "da igual",
    "cualquiera",
    "sin preferencia",
    "no tengo preferencia",
    "no importa",
    "no se",
  ].some((signal) => normalizedMessage.includes(signal));
}

function isIndifferentValue(value = "") {
  return [
    "indiferente",
    "me es indiferente",
    "me da igual",
    "da igual",
    "igual",
    "cualquiera",
    "sin preferencia",
    "no tengo preferencia",
    "no importa",
  ].includes(normalizePlainText(value));
}

async function hasSubstantiveUserMessage(messagesRef, sessionId) {
  const snapshot = await messagesRef
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

  return snapshot.docs
      .map((doc) => doc.data())
      .filter((item) => item.sessionId === sessionId && item.role === "user")
      .some((item) => {
        const normalizedText = normalizePlainText(item.text);
        return normalizedText && !isLowInformationMessage(normalizedText);
      });
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
