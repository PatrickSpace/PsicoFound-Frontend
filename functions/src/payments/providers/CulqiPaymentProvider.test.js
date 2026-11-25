const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CulqiPaymentProvider,
  normalizeCulqiCharge,
} = require("./CulqiPaymentProvider");

const config = {
  culqi: {
    secretKey: "sk_test_private",
    apiBaseUrl: "https://api.culqi.com",
  },
};

test("Culqi charge uses a vaulted card and the server amount", async () => {
  let request;
  const provider = new CulqiPaymentProvider(
      config,
      async (url, options) => {
        request = {url, options};
        return response(201, {
          object: "charge",
          id: "chr_test_1234567890",
          amount: 10000,
          currency_code: "PEN",
          state: "Exitosa",
          metadata: {booking_reference: "booking:test"},
          fee_details: [{total_amount: 421}],
        });
      },
  );
  const payment = await provider.createPayment({
    grossAmount: 10000,
    cardId: "crd_test_1234567890",
    email: "patient@example.com",
    firstName: "Ana",
    lastName: "Perez",
    phoneNumber: "999999999",
    deviceId: "12345678-1234-1234-1234-123456789012",
    externalReference: "booking:test",
  });
  assert.equal(request.url, "https://api.culqi.com/v2/charges");
  assert.equal(request.options.headers["X-Charge-Channel"], "recurrent");
  const body = JSON.parse(request.options.body);
  assert.equal(body.amount, 10000);
  assert.equal(body.source_id, "crd_test_1234567890");
  assert.equal(body.metadata.booking_reference, "booking:test");
  assert.equal(payment.processorFeeAmount, 421);
  assert.equal(payment.status, "approved");
  assert.equal(payment.externalReference, "booking:test");
});

test("Culqi 3DS review does not become an approved charge", async () => {
  const provider = new CulqiPaymentProvider(config, async () =>
    response(200, {action_code: "REVIEW"}),
  );
  const result = await provider.createPayment({
    grossAmount: 10000,
    cardId: "crd_test_1234567890",
    externalReference: "booking:test",
  });
  assert.deepEqual(result, {requires3DS: true});
});

test("ambiguous timeout is never classified as a safe retry", async () => {
  const provider = new CulqiPaymentProvider(config, async () => {
    throw new Error("socket closed");
  });
  await assert.rejects(
      provider.createPayment({grossAmount: 10000}),
      (error) =>
        error.code === "PAYMENT_PROVIDER_UNAVAILABLE" &&
      error.outcomeUnknown === true,
  );
});

test("webhook data string only identifies a charge to fetch", async () => {
  const provider = new CulqiPaymentProvider(config);
  assert.deepEqual(
      await provider.processWebhookEvent({
        body: {
          object: "event",
          id: "evt_test_123",
          type: "charge.creation.succeeded",
          data: JSON.stringify({
            object: "charge",
            id: "chr_test_1234567890",
          }),
        },
      }),
      {
        providerPaymentId: "chr_test_1234567890",
        providerEventId: "evt_test_123",
      },
  );
  await assert.rejects(
      provider.processWebhookEvent({body: {data: "{not-json"}}),
      (error) => error.code === "INVALID_WEBHOOK",
  );
});

test("Culqi charge normalization checks amount, fee and refund status", () => {
  const charge = {
    object: "charge",
    id: "chr_test_123",
    amount: 10000,
    amount_refunded: 10000,
    currency_code: "PEN",
    state: "Exitosa",
    metadata: {booking_reference: "booking:test"},
    fee_details: [{amount: 350, taxes: 63, total_amount: 413}],
  };
  const result = normalizeCulqiCharge(charge);
  assert.equal(result.status, "refunded");
  assert.equal(result.grossAmount, 10000);
  assert.equal(result.processorFeeAmount, 413);
});

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}
