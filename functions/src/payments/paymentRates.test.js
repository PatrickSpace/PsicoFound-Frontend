const {test, afterEach, mock} = require("node:test");
const assert = require("node:assert/strict");
const admin = require("firebase-admin");
const {
  normalizePaymentRate,
  normalizePaymentUrl,
  splitPaymentAmount,
} = require("./paymentRates");
const {
  savePaymentRate, setPsychologistPaymentRate,
} = require("./paymentRateHandlers");

const validRate = {
  rateId: "standard", expectedVersion: 0, name: "Sesion",
  amountMinor: 11000, paymentUrl: "https://mpago.la/test-link",
  active: true, isTest: false,
};
const adminRequest = (data) => ({auth: {uid: "admin"}, data});
const selection = (data = {}) => ({
  auth: {uid: "psychologist"},
  data: {
    therapistId: "therapist", rateId: "standard",
    expectedRateVersion: 1, expectedSelectionVersion: 0, ...data,
  },
});
const errorCode = (code) => (error) => error.code === code;

afterEach(() => mock.restoreAll());

// Transaction stub keeps writes atomic so rejected requests cannot mutate data.
function setup() {
  const documents = new Map([
    ["users/admin", {roles: ["admin"]}],
    ["users/psychologist", {roles: ["patient", "psychologist"]}],
    ["users/patient", {roles: ["patient"]}],
    ["therapists/therapist", {uid: "psychologist", activo: true}],
    ["citas/existing", {amountMinor: 12000, estado: "confirmada"}],
  ]);
  const reference = (path) => ({
    path, collection: (name) => collection(`${path}/${name}`),
  });
  const collection = (path) => ({doc: (id) => reference(`${path}/${id}`)});
  const db = {
    collection,
    runTransaction: async (callback) => {
      const changes = new Map();
      const value = await callback({
        get: async (ref) => ({
          exists: documents.has(ref.path),
          data: () => documents.get(ref.path),
        }),
        set: (ref, payload) => changes.set(ref.path, payload),
        update: (ref, payload) => {
          assert.ok(documents.has(ref.path));
          changes.set(ref.path, {...documents.get(ref.path), ...payload});
        },
        create: (ref, payload) => {
          assert.equal(documents.has(ref.path), false);
          changes.set(ref.path, payload);
        },
      });
      changes.forEach((payload, path) => documents.set(path, payload));
      return value;
    },
  };
  const firestore = Object.assign(() => db, {
    FieldValue: {serverTimestamp: () => "server-time"},
  });
  mock.getter(admin, "firestore", () => firestore);
  return documents;
}

test("splits 110, 120 and 1.10 PEN and preserves every cent", () => {
  for (const [total, psychologist, platform] of [
    [11000, 7700, 3300], [12000, 8400, 3600], [110, 77, 33],
    [1, 1, 0], [111, 78, 33],
  ]) {
    const result = splitPaymentAmount(total);
    assert.equal(result.psychologistAmountMinor, psychologist);
    assert.equal(result.platformAmountMinor, platform);
    assert.equal(psychologist + platform, total);
  }
});

test("rejects invalid or fractional cent amounts", () => {
  for (const amount of [0, -1, 1.1, "110", NaN, Infinity, 10000001]) {
    assert.throws(() => splitPaymentAmount(amount),
        errorCode("invalid-argument"));
  }
});

test("restricts links to HTTPS Mercado Pago Peru hosts", () => {
  assert.equal(normalizePaymentUrl(" https://mpago.la/example "),
      "https://mpago.la/example");
  assert.equal(normalizePaymentUrl(
      "https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=test"),
  "https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=test");
  for (const url of ["javascript:alert(1)", "http://mpago.la/test",
    "https://mpago.la.evil.test/path", "https://evil.test/mpago.la",
    "https://user:password@mpago.la/test", "https://mpago.la/",
    "https://mpago.la:8000/test", "https://mpago.la/test#fragment", null]) {
    assert.throws(() => normalizePaymentUrl(url),
        errorCode("invalid-argument"));
  }
});

test("server fixes currency and split regardless of client values", () => {
  const rate = normalizePaymentRate({
    ...validRate, currency: "USD", psychologistPercent: 100,
    psychologistAmountMinor: 11000, platformPercent: 0,
  });
  assert.equal(rate.currency, "PEN");
  assert.equal(rate.psychologistPercent, 70);
  assert.equal(rate.psychologistAmountMinor, 7700);
  assert.equal(rate.platformPercent, 30);
});

test("requires authentication and admin role for catalog changes", async () => {
  const documents = setup();
  await assert.rejects(savePaymentRate({data: validRate}),
      errorCode("unauthenticated"));
  for (const uid of ["patient", "psychologist", "unknown"]) {
    await assert.rejects(savePaymentRate({auth: {uid}, data: validRate}),
        errorCode("permission-denied"));
  }
  assert.equal(documents.has("payment_rates/standard"), false);
});

test("saves immutable versions and idempotently retries a create", async () => {
  const documents = setup();
  await savePaymentRate(adminRequest(validRate));
  await savePaymentRate(adminRequest(validRate));
  assert.equal(documents.get("payment_rates/standard").version, 1);
  await savePaymentRate(adminRequest({
    ...validRate, expectedVersion: 1,
    paymentUrl: "https://mpago.la/updated-link", active: false,
  }));
  const previous = documents.get("payment_rates/standard/versions/1");
  assert.equal(previous.paymentUrl, validRate.paymentUrl);
  assert.equal(previous.active, true);
  const current = documents.get("payment_rates/standard");
  assert.equal(current.active, false);
  assert.equal(current.version, 2);
  assert.equal(current.createdBy, "admin");
  assert.equal(documents.get("payment_rates/standard/versions/2").changedBy,
      "admin");
});

test("rejects amount edits and stale admin writes atomically", async () => {
  const documents = setup();
  await savePaymentRate(adminRequest(validRate));
  await assert.rejects(savePaymentRate(adminRequest({
    ...validRate, expectedVersion: 1, amountMinor: 12000,
  })), errorCode("failed-precondition"));
  await assert.rejects(savePaymentRate(adminRequest({
    ...validRate, expectedVersion: 0, name: "Stale change",
  })), errorCode("aborted"));
  assert.equal(documents.get("payment_rates/standard").version, 1);
  assert.equal(documents.has("payment_rates/standard/versions/2"), false);
});

test("chooses own tariff, logs it once and leaves existing appointments intact",
    async () => {
      const documents = setup();
      await savePaymentRate(adminRequest(validRate));
      await setPsychologistPaymentRate(selection());
      await setPsychologistPaymentRate(selection());
      const therapist = documents.get("therapists/therapist");
      assert.equal(therapist.paymentRateId, "standard");
      assert.equal(therapist.paymentRateSelectionVersion, 1);
      assert.equal(documents.get("therapists/therapist/rate_history/1")
          .amountMinor, 11000);
      assert.deepEqual(documents.get("citas/existing"), {
        amountMinor: 12000, estado: "confirmada",
      });
    });

test("denies selecting rates for another professional or as a patient",
    async () => {
      const documents = setup();
      await savePaymentRate(adminRequest(validRate));
      documents.set("therapists/other", {uid: "other", activo: true});
      await assert.rejects(setPsychologistPaymentRate(selection({
        therapistId: "other",
      })), errorCode("permission-denied"));
      await assert.rejects(setPsychologistPaymentRate({
        ...selection(), auth: {uid: "patient"},
      }), errorCode("permission-denied"));
      assert.equal(documents.get("therapists/therapist").paymentRateId,
          undefined);
    });

test("rejects inactive or changed tariffs and stale professional selections",
    async () => {
      const documents = setup();
      await savePaymentRate(adminRequest(validRate));
      await assert.rejects(setPsychologistPaymentRate(selection({
        expectedRateVersion: 0,
      })), errorCode("aborted"));
      await assert.rejects(setPsychologistPaymentRate(selection({
        expectedSelectionVersion: 5,
      })), errorCode("aborted"));
      await savePaymentRate(adminRequest({
        ...validRate, expectedVersion: 1, active: false,
      }));
      await assert.rejects(setPsychologistPaymentRate(selection({
        expectedRateVersion: 2,
      })), errorCode("failed-precondition"));
      assert.equal(documents.has("therapists/therapist/rate_history/1"),
          false);
    });

test("changing tariff retains historical choices", async () => {
  const documents = setup();
  await savePaymentRate(adminRequest(validRate));
  await savePaymentRate(adminRequest({
    ...validRate, rateId: "premium", amountMinor: 12000,
  }));
  await setPsychologistPaymentRate(selection());
  await setPsychologistPaymentRate(selection({
    rateId: "premium", expectedSelectionVersion: 1,
  }));
  assert.equal(documents.get("therapists/therapist/rate_history/1")
      .amountMinor, 11000);
  assert.equal(documents.get("therapists/therapist/rate_history/2")
      .amountMinor, 12000);
  assert.equal(documents.get("therapists/therapist").paymentRateId, "premium");
});
