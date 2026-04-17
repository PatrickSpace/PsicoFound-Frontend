import { getFunctions, httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
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

export async function sendProfileChatMessage(message) {
  try {
    const result = await sendProfileChatMessageCallable({ message });
    return result.data;
  } catch (error) {
    throw createProfileChatError(error);
  }
}

export async function resetProfileChatConversation() {
  try {
    const result = await resetProfileChatConversationCallable();
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
  const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      onData(
        snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((item) => item.sessionId === activeSessionId)
      );
    },
    onError
  );
}

function createProfileChatError(error) {
  const code = normalizeFunctionErrorCode(error?.code);
  const readableError = new Error(getProfileChatErrorMessage(error, code));
  readableError.code = code;
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
      "Gemini no tiene cuota o créditos disponibles en este momento. Revisa la configuración de billing/cuota en AI Studio e inténtalo luego.",
    "functions/deadline-exceeded":
      "Gemini tardó demasiado en responder. Intenta enviar un mensaje más breve o espera unos segundos.",
    "functions/unavailable":
      "El servicio de IA no está disponible por el momento. Inténtalo nuevamente en unos segundos.",
    "functions/internal":
      serverMessage && !serverMessage.includes("internal")
        ? `La IA no pudo procesar el mensaje: ${serverMessage}`
        : "La IA respondió con un error interno. Revisa los logs de Firebase Functions para ver el detalle técnico.",
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
