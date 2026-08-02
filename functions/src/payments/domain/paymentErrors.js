const {HttpsError} = require("firebase-functions/v2/https");

const ERROR_MESSAGES = {
  AUTH_REQUIRED: "Debes iniciar sesión para continuar.",
  INVALID_ROLE: "Tu cuenta no tiene permisos para realizar esta acción.",
  BOOKING_NOT_FOUND: "No encontramos la reserva.",
  BOOKING_NOT_OWNED_BY_PATIENT: "La reserva no pertenece a tu cuenta.",
  BOOKING_ALREADY_RESERVED: "Este horario ya está reservado.",
  BOOKING_HOLD_EXPIRED: "La reserva temporal venció. Elige otro horario.",
  BOOKING_ALREADY_CONFIRMED: "La cita ya está confirmada.",
  SLOT_NOT_AVAILABLE: "El horario ya no está disponible.",
  PSYCHOLOGIST_NOT_ACTIVE: "El psicólogo no está disponible para nuevas citas.",
  PAYMENT_ACCOUNT_NOT_CONNECTED: "El psicólogo aún no habilitó sus cobros.",
  PAYMENT_ACCOUNT_RESTRICTED: "La cuenta de cobros del psicólogo requiere revisión.",
  PAYMENT_ALREADY_EXISTS: "Ya existe un pago para esta reserva.",
  PAYMENT_ALREADY_APPROVED: "El pago ya fue aprobado.",
  PAYMENT_PENDING: "El pago todavía se está procesando.",
  PAYMENT_REJECTED: "No pudimos procesar el pago.",
  PAYMENT_AMOUNT_MISMATCH: "El importe del pago no coincide con la reserva.",
  PAYMENT_CURRENCY_MISMATCH: "La moneda del pago no coincide con la reserva.",
  PAYMENT_REFERENCE_MISMATCH: "La referencia del pago no es válida.",
  PAYMENT_PROVIDER_UNAVAILABLE: "El servicio de pagos no está disponible temporalmente.",
  PAYMENT_CONFIGURATION_INVALID: "La configuración de pagos no es válida.",
  INVALID_WEBHOOK: "La notificación de pago no es válida.",
  DUPLICATE_EVENT: "El evento ya fue procesado.",
  REFUND_NOT_ALLOWED: "La reserva no cumple las condiciones de reembolso.",
  REFUND_ALREADY_PROCESSED: "El reembolso ya fue procesado.",
  REFUND_PROVIDER_ERROR: "No pudimos completar el reembolso.",
  MANUAL_REVIEW_REQUIRED: "La operación requiere revisión manual.",
};

class PaymentDomainError extends Error {
  constructor(code, details = {}) {
    super(ERROR_MESSAGES[code] || "No pudimos completar la operación.");
    this.name = "PaymentDomainError";
    this.code = code;
    this.details = details;
  }
}

function toHttpsError(error) {
  if (error instanceof HttpsError) return error;
  const code = error?.code || "PAYMENT_PROVIDER_UNAVAILABLE";
  const httpsCode = code === "AUTH_REQUIRED" ? "unauthenticated" :
    code === "INVALID_ROLE" || code === "BOOKING_NOT_OWNED_BY_PATIENT" ?
      "permission-denied" :
      ["BOOKING_NOT_FOUND"].includes(code) ? "not-found" :
        ["PAYMENT_PROVIDER_UNAVAILABLE", "REFUND_PROVIDER_ERROR"].includes(code) ?
          "unavailable" : "failed-precondition";
  return new HttpsError(httpsCode, ERROR_MESSAGES[code] || error.message, {code});
}

module.exports = {ERROR_MESSAGES, PaymentDomainError, toHttpsError};
