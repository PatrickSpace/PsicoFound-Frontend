import { withTableLoadingTimeout } from "@/utils/tableLoadingTimeout";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";
import { formatAgendaInstant } from "@/utils/dateTime";
const functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1");
export async function adminCall(name, data = {}) {
  const operation = httpsCallable(functions, name)(data);
  return (await (name.startsWith("get") ? withTableLoadingTimeout(operation) : operation)).data;
}
export { watchAdminPage as watchAdminCollection } from "./adminCollectionPages";
export function adminDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && Number.isFinite(date.getTime()) ? `${formatAgendaInstant(date)} · Perú` : "Sin fecha válida";
}
export function adminRequestId() { return crypto.randomUUID(); }
