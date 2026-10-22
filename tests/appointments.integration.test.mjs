import { adminApps, adminFirestore } from "./helpers/admin-sdk.mjs";
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  terminate,
  updateDoc,
} from "firebase/firestore";
import {
  accounts,
  projectId,
  seedFollowup,
} from "./helpers/followup-fixtures.mjs";

const require = createRequire(import.meta.url);
const handlers = require(
  "../functions/src/appointments/appointmentHandlers.js"
);
const { getBookingQuote } = require(
  "../functions/src/payments/paymentOperationHandlers.js"
);
const clients = new Map();
let adminApp;

const call = (who, data) => ({
  auth: { uid: accounts[who].uid, token: {email_verified: true} },
  data,
});
const denied = (error) => error.code === "permission-denied";

async function seedSlot(id, options = {}) {
  // Satisfy the current reservation prerequisites using emulator-only data.
  const therapistId = options.therapistId || "therapist-a";
  const rateId = "appointment-test-rate";
  await adminFirestore.getFirestore().doc(`payment_rates/${rateId}`).set({
    name: "Tarifa sintética para pruebas de citas",
    amountMinor: 11000,
    currency: "PEN",
    paymentUrl: "https://example.test/pago-sintetico",
    isTest: true,
    platformPercent: 30,
    psychologistPercent: 70,
    version: 1,
    active: true,
  });
  await adminFirestore.getFirestore().doc(`therapists/${therapistId}`).update({
    paymentRateId: rateId,
    paymentRateSelectionVersion: 1,
  });
  await adminFirestore.getFirestore().doc(`therapist_availability/${id}`).set({
    therapistId,
    date: options.date || "2099-11-20",
    startTime: options.startTime || "10:00",
    endTime: options.endTime || "11:00",
    durationMinutes: 60,
    modality: "Remoto",
    location: "Terapia Online",
    timeZone: options.timeZone || "America/Lima",
    status: "available",
    bookedBy: "",
    appointmentId: "",
  });
}

async function reservation(who, slotId, requestId, extra = {}) {
  await adminFirestore.getFirestore().doc(
    `survey_summaries/${accounts[who].uid}`
  ).set({
    uid: accounts[who].uid,
    sessionId: "appointment-test-survey",
    confirmed: true,
    summary: {
      motivoConsulta: "Motivo sintético",
      soloConversar: false,
      temas: ["Ansiedad"],
      modalidad: "remoto",
      preferenciaGenero: "Indiferente",
      preferenciaEdad: "Indiferente",
      enfoque: "Indiferente",
    },
  });
  const quote = await getBookingQuote(call(who, {
    therapistId: extra.terapeutaId || "therapist-a",
  }));
  return handlers.reserveAppointment(call(who, {
    mode: "patient",
    terapeutaId: "therapist-a",
    availabilitySlotId: slotId,
    requestId,
    quoteId: quote.quoteId,
    shareSurveyHistoryConsent: true,
    ...extra,
  }));
}

before(async () => {
  assert.match(
    process.env.FIRESTORE_EMULATOR_HOST || "",
    /^(127\.0\.0\.1|localhost):\d+$/
  );
  adminApp = await seedFollowup();
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  for (const who of ["A", "B", "C", "D", "X"]) {
    const app = initializeApp(
      { projectId, apiKey: "synthetic" },
      `appointments-${who}`
    );
    const db = getFirestore(app);
    connectFirestoreEmulator(db, host, Number(port), {
      mockUserToken: {
        sub: accounts[who].uid,
        user_id: accounts[who].uid,
      },
    });
    clients.set(who, { app, db });
  }
});

beforeEach(async () => {
  await seedFollowup();
});

after(async () => {
  for (const { app, db } of clients.values()) {
    await terminate(db);
    await deleteApp(app);
  }
  if (adminApp) await adminApps.deleteApp(adminApp);
});

test("reservation is atomic, idempotent and rejects direct client writes",
  async () => {
    await seedSlot("slot-idempotent");
    const first = await reservation("B", "slot-idempotent", "reserve_same");
    const retried = await reservation("B", "slot-idempotent", "reserve_same");
    assert.equal(first.appointmentId, retried.appointmentId);

    const therapy = (await adminFirestore.getFirestore()
        .doc("terapias/b-active").get()).data();
    assert.equal(
      therapy.citas.filter((item) =>
        item.citaId === first.appointmentId).length,
      1
    );
    const slot = (await adminFirestore.getFirestore()
        .doc("therapist_availability/slot-idempotent").get()).data();
    assert.equal(slot.appointmentId, first.appointmentId);
    assert.equal(slot.bookedBy, accounts.B.uid);
    const payment = (await adminFirestore.getFirestore()
        .doc(`payment_operations/${first.appointmentId}`).get()).data();
    assert.equal(payment.patientUid, accounts.B.uid);
    assert.equal(payment.status, "pending");
    assert.equal(payment.amountMinor, 11000);
    assert.equal(payment.rateSnapshot.rateVersion, 1);

    await assert.rejects(
      updateDoc(
        doc(clients.get("B").db, `citas/${first.appointmentId}`),
        { estado: "confirmada" }
      ),
      denied
    );
    await assert.rejects(
      updateDoc(doc(clients.get("B").db, "terapias/b-active"), {
        estado: "cancelado",
      }),
      denied
    );
    await assert.rejects(
      setDoc(
        doc(clients.get("B").db, `payment_operations/${first.appointmentId}`),
        { status: "confirmed" },
        { merge: true }
      ),
      denied
    );
  });

test("only one patient wins a slot and only one open appointment is created",
  async () => {
    await seedSlot("slot-race");
    const results = await Promise.allSettled([
      reservation("B", "slot-race", "race_b"),
      reservation("C", "slot-race", "race_c"),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1
    );

    await seedFollowup();
    await seedSlot("slot-b-one", { startTime: "12:00" });
    await seedSlot("slot-b-two", { startTime: "14:00" });
    const samePatient = await Promise.allSettled([
      reservation("B", "slot-b-one", "same_patient_one"),
      reservation("B", "slot-b-two", "same_patient_two"),
    ]);
    assert.equal(
      samePatient.filter((result) => result.status === "fulfilled").length,
      1
    );
  });

test("patient cannot confirm; professional can confirm and add HTTPS link",
  async () => {
    await seedSlot("slot-transition");
    const reserved = await reservation(
      "B",
      "slot-transition",
      "transition_reserve"
    );
    await assert.rejects(
      handlers.changeAppointmentStatus(call("B", {
        mode: "patient",
        appointmentId: reserved.appointmentId,
        status: "confirmada",
        requestId: "patient_confirm",
      })),
      denied
    );
    await handlers.changeAppointmentStatus(call("A", {
      mode: "psychologist",
      appointmentId: reserved.appointmentId,
      status: "confirmada",
      requestId: "professional_confirm",
    }));
    await handlers.updateAppointmentDetails(call("A", {
      mode: "psychologist",
      appointmentId: reserved.appointmentId,
      meetingProvider: "google_meet",
      meetingUrl: "https://meet.google.com/synthetic-test",
      requestId: "professional_link",
    }));
    const saved = (await getDoc(doc(
      clients.get("B").db,
      `citas/${reserved.appointmentId}`
    ))).data();
    assert.equal(saved.estado, "confirmada");
    assert.equal(saved.meetingUrl, "https://meet.google.com/synthetic-test");
  });

test("reschedule swaps slots atomically and cancellation releases the new slot",
  async () => {
    await seedSlot("slot-old", { startTime: "09:00" });
    await seedSlot("slot-new", { startTime: "11:00" });
    const reserved = await reservation("B", "slot-old", "swap_reserve");
    await handlers.rescheduleAppointment(call("B", {
      mode: "patient",
      appointmentId: reserved.appointmentId,
      availabilitySlotId: "slot-new",
      requestId: "swap_reschedule",
    }));
    assert.equal(
      (await adminFirestore.getFirestore().doc(
          "therapist_availability/slot-old").get()).data().status,
      "available"
    );
    assert.equal(
      (await adminFirestore.getFirestore().doc(
          "therapist_availability/slot-new").get()).data().status,
      "booked"
    );
    await handlers.changeAppointmentStatus(call("B", {
      mode: "patient",
      appointmentId: reserved.appointmentId,
      status: "cancelada",
      reason: "Cancelación sintética",
      requestId: "swap_cancel",
    }));
    assert.equal(
      (await adminFirestore.getFirestore().doc(
          "therapist_availability/slot-new").get()).data().status,
      "available"
    );
  });

test("server rejects past slots and therapy status changes with open sessions",
  async () => {
    await seedSlot("slot-past", {
      date: "2020-01-01",
      startTime: "10:00",
    });
    await assert.rejects(
      reservation("B", "slot-past", "past_reserve"),
      { code: "failed-precondition" }
    );

    await seedSlot("slot-open");
    const reserved = await reservation("B", "slot-open", "open_reserve");
    await assert.rejects(
      handlers.changeTherapyStatus(call("B", {
        mode: "patient",
        therapyId: reserved.therapyId,
        status: "pausado",
        requestId: "pause_with_open",
      })),
      { code: "failed-precondition" }
    );
  });

test("unlinked actors cannot read or mutate another patient's appointment",
  async () => {
    await seedSlot("slot-private");
    const reserved = await reservation("B", "slot-private", "private_reserve");
    for (const who of ["C", "D", "X"]) {
      await assert.rejects(
        getDoc(doc(
          clients.get(who).db,
          `citas/${reserved.appointmentId}`
        )),
        denied
      );
      await assert.rejects(
        handlers.changeAppointmentStatus(call(who, {
          mode: who === "D" ? "psychologist" : "patient",
          appointmentId: reserved.appointmentId,
          status: "cancelada",
          requestId: `foreign_${who}`,
        })),
        denied
      );
    }
  });
