const {defineSecret} = require("firebase-functions/params");

const MERCADO_PAGO_ACCESS_TOKEN = defineSecret("MERCADO_PAGO_ACCESS_TOKEN");
const MERCADO_PAGO_CLIENT_SECRET = defineSecret("MERCADO_PAGO_CLIENT_SECRET");
const MERCADO_PAGO_WEBHOOK_SECRET = defineSecret("MERCADO_PAGO_WEBHOOK_SECRET");
const PAYMENT_TOKEN_ENCRYPTION_KEY = defineSecret("PAYMENT_TOKEN_ENCRYPTION_KEY");

const PLACEHOLDER_MARKERS = [
  "REEMPLAZAR",
  "YOUR_",
  "EXAMPLE",
  "PLACEHOLDER",
  "TEST-REEMPLAZAR",
  "CHANGE_ME",
];

function getPaymentConfig(overrides = {}) {
  const source = {...process.env, ...overrides};
  const config = {
    provider: source.PAYMENT_PROVIDER || "mercado_pago",
    environment: source.PAYMENT_ENVIRONMENT || "sandbox",
    appEnvironment: source.APP_ENVIRONMENT ||
      (source.K_SERVICE ? "production" : "development"),
    appBaseUrl: source.APP_BASE_URL || "http://localhost:5173",
    currency: source.PAYMENT_CURRENCY || "PEN",
    useFakeProvider: parseBoolean(source.PAYMENT_USE_FAKE_PROVIDER, true),
    bookingHoldMinutes: parsePositiveInteger(source.BOOKING_HOLD_MINUTES, 10),
    platformCommissionPercentage: parsePercentage(
        source.DEFAULT_PLATFORM_COMMISSION_PERCENTAGE,
        30,
    ),
    psychologistPercentage: parsePercentage(
        source.DEFAULT_PSYCHOLOGIST_PERCENTAGE,
        70,
    ),
    processorFeeBearer: source.PROCESSOR_FEE_BEARER || "platform",
    reconciliationEnabled: parseBoolean(
        source.PAYMENT_RECONCILIATION_ENABLED,
        true,
    ),
    reconciliationSchedule:
      source.PAYMENT_RECONCILIATION_SCHEDULE || "every 30 minutes",
    fakePaymentDefaultResult: source.FAKE_PAYMENT_DEFAULT_RESULT || "approved",
    fakePaymentWebhookDelayMs: parseNonNegativeInteger(
        source.FAKE_PAYMENT_WEBHOOK_DELAY_MS,
        1500,
    ),
    fakePaymentAllowDuplicateWebhook: parseBoolean(
        source.FAKE_PAYMENT_ALLOW_DUPLICATE_WEBHOOK,
        true,
    ),
    mercadoPago: {
      publicKey: source.MERCADO_PAGO_PUBLIC_KEY || "",
      accessToken: source.MERCADO_PAGO_ACCESS_TOKEN || "",
      clientId: source.MERCADO_PAGO_CLIENT_ID || "",
      clientSecret: source.MERCADO_PAGO_CLIENT_SECRET || "",
      webhookSecret: source.MERCADO_PAGO_WEBHOOK_SECRET || "",
      oauthRedirectUri: source.MERCADO_PAGO_OAUTH_REDIRECT_URI || "",
      webhookUrl: source.MERCADO_PAGO_WEBHOOK_URL || "",
      tokenEncryptionKey: source.PAYMENT_TOKEN_ENCRYPTION_KEY || "",
    },
  };

  validatePaymentConfig(config);
  return Object.freeze(config);
}

function validatePaymentConfig(config) {
  const errors = [];
  const production = config.appEnvironment === "production" ||
    config.environment === "production";

  if (config.provider !== "mercado_pago") errors.push("PAYMENT_PROVIDER");
  if (!["sandbox", "production"].includes(config.environment)) {
    errors.push("PAYMENT_ENVIRONMENT");
  }
  if (config.currency !== "PEN") errors.push("PAYMENT_CURRENCY");
  if (config.platformCommissionPercentage + config.psychologistPercentage !== 100) {
    errors.push("PAYMENT_PERCENTAGES");
  }
  if (!["platform", "psychologist", "patient"].includes(config.processorFeeBearer)) {
    errors.push("PROCESSOR_FEE_BEARER");
  }

  if (production) {
    if (config.useFakeProvider) errors.push("PAYMENT_USE_FAKE_PROVIDER");
    if (config.environment !== "production") errors.push("PAYMENT_ENVIRONMENT");
    [
      ["MERCADO_PAGO_ACCESS_TOKEN", config.mercadoPago.accessToken],
      ["MERCADO_PAGO_CLIENT_SECRET", config.mercadoPago.clientSecret],
      ["MERCADO_PAGO_WEBHOOK_SECRET", config.mercadoPago.webhookSecret],
      ["MERCADO_PAGO_CLIENT_ID", config.mercadoPago.clientId],
      ["PAYMENT_TOKEN_ENCRYPTION_KEY", config.mercadoPago.tokenEncryptionKey],
    ].forEach(([name, value]) => {
      if (!value || isPlaceholder(value)) errors.push(name);
    });
    [
      ["MERCADO_PAGO_OAUTH_REDIRECT_URI", config.mercadoPago.oauthRedirectUri],
      ["MERCADO_PAGO_WEBHOOK_URL", config.mercadoPago.webhookUrl],
    ].forEach(([name, value]) => {
      if (!isValidProductionUrl(value)) errors.push(name);
    });
  }

  if (errors.length) {
    const error = new Error(`PAYMENT_CONFIGURATION_INVALID: ${[...new Set(errors)].join(", ")}`);
    error.code = "PAYMENT_CONFIGURATION_INVALID";
    throw error;
  }
}

function isPlaceholder(value) {
  const normalized = String(value || "").toUpperCase();
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

function isValidProductionUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname) &&
      !isPlaceholder(value);
  } catch {
    return false;
  }
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error("PAYMENT_CONFIGURATION_INVALID: positive integer required");
    error.code = "PAYMENT_CONFIGURATION_INVALID";
    throw error;
  }
  return parsed;
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 0) {
    const error = new Error("PAYMENT_CONFIGURATION_INVALID: non-negative integer required");
    error.code = "PAYMENT_CONFIGURATION_INVALID";
    throw error;
  }
  return parsed;
}

function parsePercentage(value, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    const error = new Error("PAYMENT_CONFIGURATION_INVALID: percentage required");
    error.code = "PAYMENT_CONFIGURATION_INVALID";
    throw error;
  }
  return parsed;
}

module.exports = {
  MERCADO_PAGO_ACCESS_TOKEN,
  MERCADO_PAGO_CLIENT_SECRET,
  MERCADO_PAGO_WEBHOOK_SECRET,
  PAYMENT_TOKEN_ENCRYPTION_KEY,
  getPaymentConfig,
  isPlaceholder,
  validatePaymentConfig,
};
