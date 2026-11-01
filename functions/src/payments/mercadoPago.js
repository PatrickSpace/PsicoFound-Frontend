/* eslint-disable max-len */
const {createHmac, timingSafeEqual} = require("node:crypto");
const {HttpsError} = require("firebase-functions/v2/https");

function automationConfig(env = process.env) {
  let config;
  try {
    config = JSON.parse(env.PAYMENT_AUTOMATION_JSON || "{}");
  } catch {
    throw new Error("PAYMENT_AUTOMATION_JSON inválido.");
  }
  if (config.enabled !== true) return null;
  const origin = new URL(config.publicOrigin);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash ||
      !/^\d+$/.test(String(config.collectorId)) || !["test", "production"].includes(config.mode)) {
    throw new Error("Configuración de pagos automáticos incompleta.");
  }
  const project = env.GCLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT;
  if (config.mode === "test" && env.APP_ENV !== "staging" && !(env.FUNCTIONS_EMULATOR === "true" && /^demo-/.test(project || ""))) throw new Error("Los pagos de prueba requieren un entorno aislado.");
  if (!project || !/^[a-z0-9-]+$/.test(project)) throw new Error("Proyecto de pagos no configurado.");
  return {publicOrigin: origin.origin, collectorId: String(config.collectorId), mode: config.mode,
    notificationUrl: `https://southamerica-east1-${project}.cloudfunctions.net/mercadoPagoWebhook`};
}

// The signed ID comes from the query string, never from an untrusted resource URL.
function verifySignature({dataId, requestId, signature}, secret) {
  if (!secret || !/^[a-z0-9-]{1,100}$/i.test(dataId || "") || !/^[\w-]{1,200}$/.test(requestId || "")) return false;
  const parts = Object.fromEntries(String(signature || "").split(",").map((part) => part.trim().split("=")));
  if (!/^\d{10,16}$/.test(parts.ts || "") || !/^[a-f\d]{64}$/i.test(parts.v1 || "")) return false;
  const canonical = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(canonical).digest();
  return timingSafeEqual(expected, Buffer.from(parts.v1, "hex"));
}

function amountMinor(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) && Math.abs(value * 100 - cents) < 0.00001 ? cents : null;
}

function validatePayment(payment, operation, config) {
  if (String(payment.collector_id) !== config.collectorId) return "merchant_mismatch";
  if (payment.live_mode !== (config.mode === "production")) return "mode_mismatch";
  if (String(payment.external_reference) !== operation.id) return "reference_mismatch";
  if (payment.currency_id !== operation.currency || amountMinor(payment.transaction_amount) !== operation.amountMinor) return "amount_mismatch";
  if (!/^\d+$/.test(String(payment.id))) return "invalid_payment_id";
  return null;
}

function checkoutUrl(preference, config) {
  const value = config.mode === "test" ? preference.sandbox_init_point : preference.init_point;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password ||
      !/(^|\.)mercadopago\.(com\.pe|com|com\.ar|com\.br|com\.mx|cl|com\.co|com\.uy)$/.test(url.hostname)) {
    throw new Error("El proveedor devolvió una URL de pago inválida.");
  }
  return url.href;
}

function providerClient(token = process.env.MERCADOPAGO_ACCESS_TOKEN, fetcher = fetch) {
  async function request(path, options = {}) {
    if (process.env.FUNCTIONS_EMULATOR === "true" && fetcher === fetch) throw new Error("Proveedor real deshabilitado en emuladores.");
    if (!token) throw new HttpsError("failed-precondition", "El proveedor de pagos aún no está habilitado.");
    const response = await fetcher(`https://api.mercadopago.com${path}`, {
      ...options, headers: {"Authorization": `Bearer ${token}`, "Content-Type": "application/json", ...options.headers},
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Mercado Pago respondió ${response.status}`);
    return response.json();
  }
  return {
    createPreference: (body, key) => request("/checkout/preferences", {method: "POST", headers: {"X-Idempotency-Key": key}, body: JSON.stringify(body)}),
    getPayment: (id) => {
      if (!/^\d+$/.test(String(id))) throw new Error("ID de pago inválido.");
      return request(`/v1/payments/${id}`);
    },
    searchPayments: async (operationId) => {
      const result = await request(`/v1/payments/search?external_reference=${encodeURIComponent(operationId)}&sort=date_created&criteria=desc&limit=20`);
      return result.results || [];
    },
  };
}
module.exports = {automationConfig, verifySignature, amountMinor, validatePayment, checkoutUrl, providerClient};
