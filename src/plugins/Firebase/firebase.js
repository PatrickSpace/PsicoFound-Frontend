// Import the functions you need from the SDKs you need
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { initializeApp } from "firebase/app";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

// Carga desde .env (Vite requiere prefijo VITE_)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inicializar Firebase
const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const app = firebaseApp;

// Opt-in only; a demo project cannot reach real Firebase resources.
export const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";
if (useEmulators) {
  if (!firebaseConfig.projectId?.startsWith("demo-") ||
      !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    throw new Error("Los emuladores requieren un proyecto demo- y acceso local.");
  }
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFunctionsEmulator(getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1"), "127.0.0.1", 5001);
}

// Missing site keys leave help/navigation available; protected calls fail closed.
// Debug tokens are intentionally not supported in production bundles.
if (!useEmulators && import.meta.env.VITE_APP_CHECK_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_APP_CHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
