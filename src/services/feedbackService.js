import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";

const functions = getFunctions(
  app,
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1"
);

function callable(name) {
  return httpsCallable(functions, name);
}

export async function createFeedback(data = {}) {
  const response = await callable("createSupportRequest")({
    category: data.categoria || "comentario",
    message: data.mensajeObservacion || "",
    requestId: data.requestId || createRequestId(),
    ...(data.paymentOperationId ? {paymentOperationId: data.paymentOperationId} : {}),
  });
  return response.data;
}

export function watchOwnSupportRequests(uid, onData, onError) {
  if (!uid) return () => {};
  const requestsQuery = query(
    collection(db, "support_requests"),
    where("requesterUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    requestsQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }))),
    onError
  );
}

function createRequestId() {
  return `support_${globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}_${Math.random().toString(36).slice(2)}`}`.replace(
    /[^A-Za-z0-9_-]/g,
    "_"
  );
}
