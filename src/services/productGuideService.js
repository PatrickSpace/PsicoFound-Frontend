import { getFunctions, httpsCallable } from "firebase/functions";
import { reactive } from "vue";
import { app } from "@/plugins/Firebase/firebase";

const functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1");
export const guideSession = reactive({ uid: "", role: "", open: false, step: 0 });
export async function getProfessionalSetup() {
  return (await httpsCallable(functions, "getProfessionalSetup")({})).data;
}
export async function updateProfessionalSetup(data) {
  return (await httpsCallable(functions, "updateProfessionalSetup")(data)).data;
}
export async function saveProductGuide(data) {
  return (await httpsCallable(functions, "saveProductGuide")(data)).data;
}
