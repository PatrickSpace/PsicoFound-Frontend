import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";

const LONGITUDINAL_HISTORY_COLLECTION = "longitudinal_history";

export async function appendLongitudinalEvent(data = {}) {
  if (!data.pacienteUid || !data.eventType) {
    throw new Error("Missing pacienteUid or eventType");
  }

  const payload = {
    pacienteUid: data.pacienteUid,
    eventType: data.eventType,
    sourceType: data.sourceType || "",
    sourceId: data.sourceId || "",
    terapiaId: data.terapiaId || "",
    title: data.title || "Evento registrado",
    summary: data.summary || "",
    metadata: data.metadata || {},
    visibility: data.visibility || "patient",
    createdBy: data.createdBy || data.pacienteUid,
    occurredAt: data.occurredAt || new Date().toISOString(),
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, LONGITUDINAL_HISTORY_COLLECTION),
    payload
  );

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function getLongitudinalHistoryByPatient(pacienteUid) {
  if (!pacienteUid) {
    return [];
  }

  const historyRef = collection(db, LONGITUDINAL_HISTORY_COLLECTION);
  const historyQuery = query(
    historyRef,
    where("pacienteUid", "==", pacienteUid)
  );
  const snapshot = await getDocs(historyQuery);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort((a, b) => toDate(b.occurredAt) - toDate(a.occurredAt));
}

export async function getLongitudinalHistoryByTherapy(terapiaId) {
  if (!terapiaId) {
    return [];
  }

  const historyRef = collection(db, LONGITUDINAL_HISTORY_COLLECTION);
  const historyQuery = query(historyRef, where("terapiaId", "==", terapiaId));
  const snapshot = await getDocs(historyQuery);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort((a, b) => toDate(b.occurredAt) - toDate(a.occurredAt));
}

function toDate(value) {
  if (!value) {
    return new Date(0);
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}
