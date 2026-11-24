import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";

const functions = getFunctions(app, "southamerica-east1");

const callables = Object.fromEntries(
  [
    "createPaymentAccountConnection",
    "createMercadoPagoAuthorizationUrl",
    "getPaymentAccountStatus",
    "updatePsychologistPaymentSettings",
    "disconnectPaymentAccount",
    "createBookingHold",
    "createBookingPayment",
    "savePsychologistPayoutAccount",
    "listCulqiCards",
    "saveCulqiCard",
    "completeCulqiCard3DS",
    "removeCulqiCard",
    "completeCulqiPayment3DS",
    "getBookingPaymentStatus",
    "listMyPaymentBookings",
    "expireBookingHold",
    "cancelBooking",
    "requestBookingRefund",
    "simulatePaymentEvent",
  ].map((name) => [name, httpsCallable(functions, name)])
);

export async function connectPaymentAccount() {
  return unwrap(await callables.createPaymentAccountConnection());
}

export async function createPaymentAuthorizationUrl() {
  return unwrap(await callables.createMercadoPagoAuthorizationUrl());
}

export async function getPaymentAccountStatus() {
  return unwrap(await callables.getPaymentAccountStatus());
}

export async function savePaymentSettings(sessionPriceAmount) {
  return unwrap(
    await callables.updatePsychologistPaymentSettings({ sessionPriceAmount })
  );
}

export async function savePsychologistPayoutAccount(payload) {
  return unwrap(await callables.savePsychologistPayoutAccount(payload));
}

export async function listCulqiCards() {
  return unwrap(await callables.listCulqiCards());
}

export async function saveCulqiCard(payload) {
  return unwrap(await callables.saveCulqiCard(payload));
}

export async function completeCulqiCard3DS(payload) {
  return unwrap(await callables.completeCulqiCard3DS(payload));
}

export async function removeCulqiCard(cardId) {
  return unwrap(await callables.removeCulqiCard({ cardId }));
}

export async function completeCulqiPayment3DS(payload) {
  return unwrap(await callables.completeCulqiPayment3DS(payload));
}

export async function disconnectPaymentAccount() {
  return unwrap(await callables.disconnectPaymentAccount());
}

export async function createBookingHold(payload) {
  return unwrap(await callables.createBookingHold(payload));
}

export async function createBookingPayment(payload) {
  return unwrap(await callables.createBookingPayment(payload));
}

export async function getBookingPaymentStatus(bookingId) {
  return unwrap(await callables.getBookingPaymentStatus({ bookingId }));
}

export async function getMyPaymentBookings() {
  return unwrap(await callables.listMyPaymentBookings());
}

export async function cancelPaidBooking(bookingId, reason = "") {
  return unwrap(await callables.cancelBooking({ bookingId, reason }));
}

export async function requestBookingRefund(bookingId, reasonCode) {
  return unwrap(await callables.requestBookingRefund({ bookingId, reasonCode }));
}

export async function simulatePaymentEvent(bookingId, status) {
  return unwrap(await callables.simulatePaymentEvent({ bookingId, status }));
}

export function paymentErrorMessage(error) {
  const code = error?.details?.code || error?.code?.split("/").pop() || "";
  const messages = {
    SLOT_NOT_AVAILABLE: "El horario ya no está disponible. Elige otro bloque.",
    PAYMENT_ACCOUNT_NOT_CONNECTED:
      "Este psicólogo aún no habilitó sus cobros.",
    PAYMENT_ACCOUNT_RESTRICTED:
      "La cuenta de cobros del psicólogo requiere revisión.",
    BOOKING_HOLD_EXPIRED:
      "La reserva temporal venció. Elige nuevamente el horario.",
    PAYMENT_REJECTED:
      "No pudimos procesar el pago. Verifica tu tarjeta o utiliza otro medio.",
    PAYMENT_PROVIDER_UNAVAILABLE:
      "El servicio de pagos no está disponible temporalmente.",
    PAYMENT_CONFIGURATION_INVALID:
      "Los pagos aún no están configurados para este entorno.",
    PAYMENT_PENDING:
      "El pago sigue en proceso. Consulta su estado antes de volver a intentarlo.",
    MANUAL_REVIEW_REQUIRED:
      "Estamos verificando este cobro. No vuelvas a pagar hasta recibir una confirmación.",
    "resource-exhausted":
      "Has realizado demasiados intentos. Espera un momento y vuelve a intentarlo.",
    "failed-precondition":
      "No pudimos verificar la aplicación o el estado de la reserva.",
  };
  return messages[code] || "No pudimos completar el pago. Intenta nuevamente.";
}

function unwrap(result) {
  return result?.data ?? result;
}
