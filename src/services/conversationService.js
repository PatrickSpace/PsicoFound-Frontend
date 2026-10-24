import { getFunctions, httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  getDocs,
  startAfter,
} from "firebase/firestore";
import { app } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";

const FUNCTIONS_REGION =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1";
const functions = getFunctions(app, FUNCTIONS_REGION);
const sendProfileChatMessageCallable = httpsCallable(
  functions,
  "sendProfileChatMessage"
);
const resetProfileChatConversationCallable = httpsCallable(
  functions,
  "resetProfileChatConversation"
);
const updateProfilePreferencesCallable = httpsCallable(
  functions,
  "updateProfilePreferences"
);
const confirmProfileSummaryCallable = httpsCallable(
  functions,
  "confirmProfileSummary"
);

export async function startProfileChatConversation() {
  const result = await httpsCallable(functions, "startProfileChatConversation")();
  return result.data;
}

export async function sendProfileChatMessage(message, requestId, context = {}) {
  try {
    const result = await sendProfileChatMessageCallable({ message, requestId, ...context });
    return result.data;
  } catch (error) {
    throw createProfileChatError(error);
  }
}

export async function updateProfilePreferences(profile, context = {}) {
  try {
    const result = await updateProfilePreferencesCallable({ profile, ...context });
    return result.data;
  } catch (error) {
    throw createProfileChatError(error);
  }
}

export async function confirmProfileSummary(sessionId) {
  try {
    const result = await confirmProfileSummaryCallable({ sessionId });
    return result.data;
  } catch (error) {
    throw createProfileChatError(error);
  }
}

export async function resetProfileChatConversation(requestId) {
  try {
    const result = await resetProfileChatConversationCallable({ requestId });
    return result.data;
  } catch (error) {
    throw createProfileChatError(error);
  }
}

export function watchProfile(uid, onData, onError) {
  if (!uid) {
    return () => {};
  }

  const profileRef = doc(db, "profiles", uid);

  return onSnapshot(
    profileRef,
    (snapshot) => {
      onData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError
  );
}

export function watchConversation(uid, onData, onError) {
  if (!uid) {
    return () => {};
  }

  const conversationRef = doc(db, "conversations", uid);

  return onSnapshot(
    conversationRef,
    (snapshot) => {
      onData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError
  );
}

export function watchConversationMessages(uid, activeSessionId, onData, onError) {
  if (!uid) {
    return () => {};
  }

  const messagesRef = collection(db, "conversations", uid, "messages");
  const messagesQuery = query(messagesRef, where("sessionId", "==", activeSessionId), orderBy("createdAt", "desc"), limit(100));

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      onData(
        snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((item) => item.sessionId === activeSessionId).reverse(),
        {cursor: snapshot.docs.at(-1) || null, hasMore: snapshot.size === 100}
      );
    },
    onError
  );
}

export async function loadEarlierConversationMessages(uid, sessionId, cursor) {
  if (!uid || !sessionId || !cursor) return {items: [], cursor: null, hasMore: false};
  const snapshot = await getDocs(query(collection(db, "conversations", uid, "messages"),
    where("sessionId", "==", sessionId), orderBy("createdAt", "desc"), startAfter(cursor), limit(100)));
  return {items: snapshot.docs.map(item => ({id: item.id, ...item.data()})).reverse(),
    cursor: snapshot.docs.at(-1) || null, hasMore: snapshot.size === 100};
}

function createProfileChatError(error) {
  const code = normalizeFunctionErrorCode(error?.code);
  const readableError = new Error(getProfileChatErrorMessage(error, code));
  readableError.code = code;
  readableError.details = error?.details || null;
  readableError.originalMessage = (error?.message || "").toString();
  return readableError;
}

function getProfileChatErrorMessage(error, normalizedCode) {
  const code = normalizedCode || normalizeFunctionErrorCode(error?.code);
  const serverMessage = (error?.message || "").toString().trim();

  const messages = {
    "functions/unauthenticated":
      "Tu sesión expiró. Inicia sesión nuevamente para continuar.",
    "functions/invalid-argument":
      "El mensaje no es válido. Intenta escribirlo un poco más corto.",
    "functions/resource-exhausted":
      "El proveedor de IA no tiene cuota disponible en este momento.",
    "functions/deadline-exceeded":
      "El proveedor de IA tardó demasiado en responder. Intenta enviar un mensaje más breve o espera unos segundos.",
    "functions/unavailable":
      "La asistencia con IA no está disponible en este momento. Puedes intentarlo nuevamente en unos minutos o continuar seleccionando una de las opciones.",
    "functions/internal":
      serverMessage && !serverMessage.includes("internal")
        ? `La IA no pudo procesar el mensaje: ${serverMessage}`
        : "No pudimos procesar el mensaje en este momento. Inténtalo nuevamente.",
  };

  return (
    messages[code] ||
    error?.message ||
    "No pudimos enviar el mensaje. Inténtalo nuevamente en unos segundos."
  );
}

function normalizeFunctionErrorCode(code = "") {
  const normalized = code.toString().trim();

  if (!normalized) {
    return "";
  }

  return normalized.startsWith("functions/")
    ? normalized
    : `functions/${normalized}`;
}
