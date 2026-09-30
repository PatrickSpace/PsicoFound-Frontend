const {HttpsError} = require("firebase-functions/v2/https");

const PLATFORM_PERCENT = 30;
const PSYCHOLOGIST_PERCENT = 70;
const MAX_AMOUNT_MINOR = 10000000;
const PAYMENT_HOSTS = new Set([
  "mpago.la",
  "mercadopago.com.pe",
  "www.mercadopago.com.pe",
]);

function requireDocumentId(value) {
  if (typeof value !== "string" || !/^[\w-]{1,128}$/.test(value)) {
    throw new HttpsError("invalid-argument", "Identificador no valido.");
  }
  return value;
}

function requireVersion(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new HttpsError("invalid-argument", "Version no valida.");
  }
  return value;
}

function splitPaymentAmount(amountMinor) {
  if (!Number.isSafeInteger(amountMinor) ||
      amountMinor < 1 || amountMinor > MAX_AMOUNT_MINOR) {
    throw new HttpsError(
        "invalid-argument",
        "Ingresa un importe entre S/0.01 y S/100,000.00, con dos decimales.",
    );
  }
  const psychologistAmountMinor =
    Math.round(amountMinor * PSYCHOLOGIST_PERCENT / 100);
  return {
    platformPercent: PLATFORM_PERCENT,
    psychologistPercent: PSYCHOLOGIST_PERCENT,
    psychologistAmountMinor,
    platformAmountMinor: amountMinor - psychologistAmountMinor,
  };
}

function normalizePaymentUrl(value) {
  if (typeof value !== "string" || value.length > 2048) {
    throw new HttpsError("invalid-argument", "Link de pago no valido.");
  }
  let url;
  try {
    url = new URL(value.trim());
  } catch (error) {
    throw new HttpsError("invalid-argument", "Link de pago no valido.");
  }
  if (url.protocol !== "https:" || !PAYMENT_HOSTS.has(url.hostname) ||
      url.username || url.password || url.port || url.hash ||
      url.pathname === "/") {
    throw new HttpsError(
        "invalid-argument",
        "Usa un link HTTPS de mpago.la o mercadopago.com.pe.",
    );
  }
  return url.href;
}

function normalizePaymentRate(data = {}) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name || name.length > 80 || typeof data.active !== "boolean" ||
      typeof data.isTest !== "boolean") {
    throw new HttpsError(
        "invalid-argument",
        "Completa el nombre (hasta 80 caracteres) y el estado de la tarifa.",
    );
  }
  return {
    name,
    amountMinor: data.amountMinor,
    currency: "PEN",
    paymentUrl: normalizePaymentUrl(data.paymentUrl),
    active: data.active,
    isTest: data.isTest,
    ...splitPaymentAmount(data.amountMinor),
  };
}

function assertSameAmount(existing, next) {
  if (existing.amountMinor !== next.amountMinor ||
      existing.currency !== next.currency) {
    throw new HttpsError(
        "failed-precondition",
        "El importe es fijo. Crea otra tarifa para ofrecer un precio nuevo.",
    );
  }
}

module.exports = {
  assertSameAmount,
  normalizePaymentRate,
  normalizePaymentUrl,
  requireDocumentId,
  requireVersion,
  splitPaymentAmount,
};
