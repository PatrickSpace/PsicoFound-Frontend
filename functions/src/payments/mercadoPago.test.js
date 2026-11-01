/* eslint-disable max-len */
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {createHmac} = require("node:crypto");
const {verifySignature, automationConfig, validatePayment, amountMinor, checkoutUrl, providerClient} = require("./mercadoPago");
const config = {collectorId: "123", mode: "test", publicOrigin: "https://example.test"};
const op = {id: "reservation", amountMinor: 12000, currency: "PEN"};
const payment = {id: 123456, external_reference: op.id, collector_id: 123, live_mode: false, transaction_amount: 120, currency_id: "PEN"};
test("webhook signatures bind resource, request ID and timestamp using constant-time HMAC", () => {
  const ts = "1742505638683"; const requestId = "synthetic-request"; const secret = "synthetic-only";
  const signature = `ts=${ts},v1=${createHmac("sha256", secret).update(`id:123;request-id:${requestId};ts:${ts};`).digest("hex")}`;
  assert.equal(verifySignature({dataId: "123", requestId, signature}, secret), true);
  for (const patch of [{dataId: "124"}, {requestId: "other"}, {signature: "ts=1,v1=bad"}, {dataId: "../../resource"}]) assert.equal(verifySignature({dataId: "123", requestId, signature, ...patch}, secret), false);
  assert.equal(verifySignature({dataId: "123", requestId, signature}, "wrong"), false);
});
test("payments require exact amount, currency, merchant, environment and reservation", () => {
  assert.equal(validatePayment(payment, op, config), null);
  for (const [patch, expected] of [[{collector_id: 999}, "merchant_mismatch"], [{live_mode: true}, "mode_mismatch"], [{external_reference: "other"}, "reference_mismatch"], [{transaction_amount: 119.99}, "amount_mismatch"], [{currency_id: "USD"}, "amount_mismatch"], [{id: "https://other.test"}, "invalid_payment_id"]]) {
    assert.equal(validatePayment({...payment, ...patch}, op, config), expected);
  }
});
test("amount conversion rejects non-numeric, negative and fractional cents", () => {
  assert.equal(amountMinor(19.99), 1999);
  for (const value of ["120", NaN, Infinity, -1, 0, 12.001]) assert.equal(amountMinor(value), null);
});
test("automatic payment configuration is opt-in and validates HTTPS origin and merchant", () => {
  assert.equal(automationConfig({}), null);
  const valid = {PAYMENT_AUTOMATION_JSON: JSON.stringify({enabled: true, ...config}), GCLOUD_PROJECT: "demo-test", FUNCTIONS_EMULATOR: "true"};
  assert.equal(automationConfig(valid).notificationUrl, "https://southamerica-east1-demo-test.cloudfunctions.net/mercadoPagoWebhook");
  for (const patch of [{publicOrigin: "http://example.test"}, {publicOrigin: "https://example.test/nested"}, {collectorId: "abc"}, {mode: "unknown"}]) assert.throws(() => automationConfig({...valid, PAYMENT_AUTOMATION_JSON: JSON.stringify({enabled: true, ...config, ...patch})}));
});
test("checkout redirect accepts only provider HTTPS hosts in the selected environment", () => {
  assert.equal(checkoutUrl({sandbox_init_point: "https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=synthetic"}, config).startsWith("https://sandbox.mercadopago.com.pe/"), true);
  for (const url of ["javascript:alert(1)", "https://mercadopago.com.pe.evil.test", "http://mercadopago.com.pe", "https://user:pass@mercadopago.com.pe"]) assert.throws(() => checkoutUrl({sandbox_init_point: url}, config));
});
test("provider requests use fixed API origin, authentication and timeout; arbitrary resource URLs fail", async () => {
  const calls = [];
  const client = providerClient("synthetic-only", async (url, options) => {
    calls.push({url, options}); return {ok: true, json: async () => ({id: 123})};
  });
  await client.getPayment("123");
  assert.equal(calls[0].url, "https://api.mercadopago.com/v1/payments/123");
  assert.equal(calls[0].options.headers.Authorization, "Bearer synthetic-only");
  assert.ok(calls[0].options.signal);
  assert.throws(() => client.getPayment("https://untrusted.test"));
});
