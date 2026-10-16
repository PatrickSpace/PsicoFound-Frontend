import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";

const functions = getFunctions(
  app,
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1"
);

async function callAccountFunction(name, data = {}) {
  const callable = httpsCallable(functions, name);
  const response = await callable(data);
  return response.data;
}

export function updateOwnProfile(data) {
  return callAccountFunction("updateOwnProfile", data);
}

export function getAccountAccessStatus() {
  return callAccountFunction("getAccountAccessStatus");
}

export function acceptCurrentConsent(policy) {
  return callAccountFunction("acceptCurrentConsent", {
    legalAccepted: true, legalVersion: policy.version,
    termsUrl: policy.termsUrl, privacyUrl: policy.privacyUrl,
  });
}

export function syncOwnAuthEmail() {
  return callAccountFunction("syncOwnAuthEmail");
}

export function exportOwnData() {
  return callAccountFunction("exportOwnData");
}

export function requestAccountDeletion(confirmation) {
  return callAccountFunction("requestAccountDeletion", { confirmation });
}
