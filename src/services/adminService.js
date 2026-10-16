import { withTableLoadingTimeout, TABLE_LOADING_TIMEOUT_MS, TABLE_LOADING_TIMEOUT_MESSAGE } from "@/utils/tableLoadingTimeout";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, onSnapshot } from "firebase/firestore";
import { app } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";
import { formatAgendaInstant } from "@/utils/dateTime";
const functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1");
export async function adminCall(name, data = {}) {
  const operation = httpsCallable(functions, name)(data);
  return (await (name.startsWith("get") ? withTableLoadingTimeout(operation) : operation)).data;
}
export function watchAdminCollection(name, onData, onError) {
  let stopped = false;
  const timer = setTimeout(() => {
    stopped = true; unsubscribe(); onError(new Error(TABLE_LOADING_TIMEOUT_MESSAGE));
  }, TABLE_LOADING_TIMEOUT_MS);
  const unsubscribe = onSnapshot(collection(db, name), snapshot => {
    clearTimeout(timer);
    if (!stopped) onData(snapshot.docs.map(doc => ({...doc.data(), id: doc.id})));
  }, error => { clearTimeout(timer); if (!stopped) onError(error); });
  return () => { stopped = true; clearTimeout(timer); unsubscribe(); };
}
export function adminDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && Number.isFinite(date.getTime()) ? `${formatAgendaInstant(date)} · Perú` : "Sin fecha válida";
}
export function adminRequestId() { return crypto.randomUUID(); }
