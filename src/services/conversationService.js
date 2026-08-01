import { getFunctions, httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { app, auth } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";
import {
  subscribeDocument,
  subscribeQuery,
} from "@/repositories/firestoreRepository";
import { finOpsTracker } from "@/utils/finOpsTracker";
import {
  CACHE_TTL,
  invalidateCachePrefix,
  setCachedValue,
} from "@/utils/requestCache";

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
  return callProfileFunction({
    callable: sendProfileChatMessageCallable,
    payload: { message },
    operation: "sendProfileChatMessage",
  });
}

export async function resetProfileChatConversation() {
  return callProfileFunction({
    callable: resetProfileChatConversationCallable,
    operation: "resetProfileChatConversation",
  });
}

export function watchProfile(uid, onData, onError) {
  if (!uid) {
    return () => {};
  }

  const profileRef = doc(db, "profiles", uid);

  return subscribeDocument(
    profileRef,
    {
      key: `profile:${uid}`,
      resource: "profiles",
      source: "watchProfile",
    },
    (snapshot) => {
      const profile = snapshot.exists()
        ? { id: snapshot.id, ...snapshot.data() }
        : null;
      setCachedValue({
        key: "initial-profile",
        scope: uid,
        value: profile,
        ttl: CACHE_TTL.PROFILE,
      });
      onData(profile);
    },
    onError
  );
}

export function watchConversation(uid, onData, onError) {
  if (!uid) {
    return () => {};
  }

  const conversationRef = doc(db, "conversations", uid);

  return subscribeDocument(
    conversationRef,
    {
      key: `conversation:${uid}`,
      resource: "conversations",
      source: "watchConversation",
    },
    (snapshot) => {
      onData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError
  );
}

export function watchConversationMessages(uid, activeSessionId, onData, onError) {
  if (!uid || !activeSessionId) {
    onData?.([]);
    return () => {};
  }

  const messagesRef = collection(db, "conversations", uid, "messages");
  const messagesQuery = query(
    messagesRef,
    where("sessionId", "==", activeSessionId),
    orderBy("createdAt", "asc")
  );

  return subscribeQuery(
    messagesQuery,
    {
      key: `conversation-messages:${uid}:${activeSessionId}`,
      resource: "conversation-messages",
      source: "watchConversationMessages",
    },
    (snapshot) => {
      onData(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );
    },
    onError
  );
}

async function callProfileFunction({ callable, payload, operation }) {
  const startedAt = performance.now();

  try {
    const result = await callable(payload);
    finOpsTracker.track({
      type: "external-request",
      resource: "profile-chat",
      source: "conversationService",
      operation,
      durationMs: performance.now() - startedAt,
    });
    invalidateCachePrefix("matching:", authScope());
    return result.data;
  } catch (error) {
    finOpsTracker.track({
      type: "external-request-error",
      resource: "profile-chat",
      source: "conversationService",
      operation,
      durationMs: performance.now() - startedAt,
      errorType: error?.code || error?.name || "unknown",
    });
    throw createProfileChatError(error);
  }
}

function authScope() {
  return auth.currentUser?.uid || "anonymous";
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
      "El proveedor de IA no tiene cuota disponible en este momento.",
    "functions/deadline-exceeded":
      "El proveedor de IA tardó demasiado en responder. Intenta enviar un mensaje más breve o espera unos segundos.",
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
