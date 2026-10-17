import { reactive } from "vue";
import { sendEmailVerification } from "firebase/auth";
import { auth, useEmulators } from "@/plugins/Firebase/firebase";
import { verificationActionSettings, verificationResendSeconds } from "@/utils/emailVerification";
export const verificationDelivery = reactive({uid:"", attemptedAt:0, sentAt:0});
const pending = new Map();
export function verificationLastAttempt(uid) {
  if (verificationDelivery.uid === uid) return verificationDelivery.attemptedAt;
  try { return Number(sessionStorage.getItem(`lurems-verification-attempt:${uid}`)) || 0; }
  catch { return 0; }
}
export function sendVerificationEmail(user) {
  if (!user || auth.currentUser?.uid !== user.uid) return Promise.reject(new Error("Inicia sesión para enviar la verificación."));
  if (user.emailVerified) return Promise.resolve();
  if (pending.has(user.uid)) return pending.get(user.uid);
  if (verificationResendSeconds(verificationLastAttempt(user.uid)) > 0) {
    return Promise.reject(Object.assign(new Error("Espera un minuto antes de solicitar otro enlace."), {code:"verification/cooldown"}));
  }
  auth.languageCode = "es";
  Object.assign(verificationDelivery, {uid:user.uid, attemptedAt:Date.now(), sentAt:0});
  try { sessionStorage.setItem(`lurems-verification-attempt:${user.uid}`, String(verificationDelivery.attemptedAt)); }
  catch { /* In-memory protection still prevents repeated sends. */ }
  const operation = sendEmailVerification(user, verificationActionSettings(window.location.origin, useEmulators))
    .then(() => { if (verificationDelivery.uid === user.uid) verificationDelivery.sentAt = Date.now(); })
    .finally(() => pending.delete(user.uid));
  pending.set(user.uid, operation);
  return operation;
}
export function verificationSendError(error) {
  if (error?.code === "verification/cooldown") return "Espera un minuto antes de solicitar otro enlace.";
  if (error?.code === "auth/too-many-requests") return "Firebase limitó temporalmente los envíos. Espera unos minutos antes de volver a intentarlo.";
  if (error?.code === "auth/network-request-failed") return "No pudimos enviar el correo por un problema de conexión. Revisa tu conexión e intenta nuevamente.";
  return "No pudimos enviar el correo de verificación. Intenta nuevamente más tarde.";
}
