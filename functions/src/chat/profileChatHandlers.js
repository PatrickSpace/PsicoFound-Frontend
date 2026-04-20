const admin = require("firebase-admin");
const {HttpsError} = require("firebase-functions/v2/https");
const {askGemini} = require("../ai/geminiClient");
const {getRecentHistory} = require("./history");
const {
  createChatSession,
  getActiveChatSession,
} = require("./session");
const {
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

  await profileRef.set(
      {
        ...currentProfile,
        ...cleanData,
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

  return {
    reply,
    data: cleanData,
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

module.exports = {
  resetProfileChatConversation,
  sendProfileChatMessage,
};
