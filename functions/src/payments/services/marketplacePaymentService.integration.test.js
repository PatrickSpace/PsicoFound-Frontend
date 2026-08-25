const test = require("node:test");
const assert = require("node:assert/strict");
const admin = require("firebase-admin");
const {getPaymentConfig} = require("../config/paymentConfig");
const {
  FakeMarketplacePaymentProvider,
} = require("../providers/FakeMarketplacePaymentProvider");
const {MarketplacePaymentService} = require("./marketplacePaymentService");

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

test("fake payment confirms one booking and creates ledger once", {
  skip: !emulatorEnabled,
}, async () => {
  const {db, service} = createTestService();
  await seed(db, "slot-1");
  const booking = await service.createBookingHold("patient-1", {
    slotId: "slot-1",
    timezone: "America/Lima",
  });
  const result = await service.createBookingPayment("patient-1", {
    bookingId: booking.id,
    paymentToken: "fake-token",
    paymentMethodId: "fake-card",
    fakeScenario: "approved",
    paymentTermsAccepted: true,
    paymentConsentVersion: "2026-08-24",
  });
  assert.equal(result.payment.status, "approved");
  assert.equal(result.booking.status, "confirmed");
  const therapy = await db.collection("terapias")
      .where("pacienteUid", "==", "patient-1")
      .where("estado", "==", "activo").limit(1).get();
  assert.equal(therapy.size, 1);
  assert.equal(therapy.docs[0].data().citas.length, 1);
  const ledger = await db.collection("ledger_entries")
      .where("bookingId", "==", booking.id).get();
  assert.equal(ledger.size, 3);
  const retry = await service.createBookingPayment("patient-1", {
    bookingId: booking.id,
    paymentToken: "fake-token",
    paymentMethodId: "fake-card",
    paymentTermsAccepted: true,
    paymentConsentVersion: "2026-08-24",
  });
  assert.equal(retry.status, "approved");
  const ledgerAfterRetry = await db.collection("ledger_entries")
      .where("bookingId", "==", booking.id).get();
  assert.equal(ledgerAfterRetry.size, 3);

  const payment = (await db.collection("payments").doc(booking.id).get()).data();
  const duplicateState = await service.processPaymentProviderEvent({
    providerEventId: `fake-distinct-event-${booking.id}`,
    providerPaymentId: payment.providerPaymentId,
    providerAccountId: payment.providerAccountId,
    status: "approved",
    currency: payment.currency,
    grossAmount: payment.grossAmount,
    processorFeeAmount: 0,
    externalReference: payment.externalReference,
  });
  assert.equal(duplicateState.duplicate, true);
  const ledgerAfterDistinctEvent = await db.collection("ledger_entries")
      .where("bookingId", "==", booking.id).get();
  assert.equal(ledgerAfterDistinctEvent.size, 3);
});

test("rejected payment expires and releases its slot", {
  skip: !emulatorEnabled,
}, async () => {
  const {db, service} = createTestService();
  await seed(db, "slot-2");
  const booking = await service.createBookingHold("patient-1", {
    slotId: "slot-2",
  });
  const result = await service.createBookingPayment("patient-1", {
    bookingId: booking.id,
    paymentToken: "fake-token",
    paymentMethodId: "fake-card",
    fakeScenario: "rejected",
    paymentTermsAccepted: true,
    paymentConsentVersion: "2026-08-24",
  });
  assert.equal(result.payment.status, "rejected");
  assert.equal(result.booking.status, "payment_failed");
  await db.collection("bookings").doc(booking.id).update({
    holdExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() - 1000),
  });
  const expired = await service.expireBookingHold(booking.id);
  assert.equal(expired.expired, true);
  const slot = await db.collection("therapist_availability").doc("slot-2").get();
  assert.equal(slot.data().status, "available");
});

function createTestService() {
  if (!admin.apps.length) admin.initializeApp({projectId: "lurems-payment-test"});
  const db = admin.firestore();
  const config = getPaymentConfig({
    APP_ENVIRONMENT: "development",
    PAYMENT_ENVIRONMENT: "sandbox",
    PAYMENT_USE_FAKE_PROVIDER: "true",
  });
  return {
    db,
    service: new MarketplacePaymentService({
      db,
      config,
      provider: new FakeMarketplacePaymentProvider(config),
    }),
  };
}

async function seed(db, slotId) {
  const batch = db.batch();
  batch.set(db.collection("users").doc("patient-1"), {
    roles: ["patient"],
    rol: "patient",
  });
  batch.set(db.collection("users").doc("psychologist-1"), {
    roles: ["patient", "psychologist"],
    rol: "psicologo",
  });
  batch.set(db.collection("therapists").doc("therapist-1"), {
    uid: "psychologist-1",
    nombre: "Psicólogo de prueba",
    activo: true,
    sessionPriceAmount: 10000,
  });
  batch.set(db.collection("payment_accounts").doc("therapist-1"), {
    psychologistId: "therapist-1",
    psychologistUid: "psychologist-1",
    providerAccountId: "fake-seller-therapist-1",
    status: "connected",
    isFake: true,
  });
  batch.set(db.collection("therapist_availability").doc(slotId), {
    therapistId: "therapist-1",
    date: "2030-08-10",
    startTime: "10:00",
    endTime: "11:00",
    modality: "Remoto",
    location: "Terapia Online",
    status: "available",
  });
  await batch.commit();
}
