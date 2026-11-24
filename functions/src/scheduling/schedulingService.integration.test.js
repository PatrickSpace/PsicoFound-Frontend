const {getApps, initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const {
  SchedulingService,
  reminderFields,
} = require("./schedulingService");
const c = require("./calendar");
const {
  MarketplacePaymentService,
} = require("../payments/services/marketplacePaymentService");
const {
  FakeMarketplacePaymentProvider,
} = require("../payments/providers/FakeMarketplacePaymentProvider");
const {getPaymentConfig} = require("../payments/config/paymentConfig");

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const now = c.timestamp("2030-01-01", "08:00");
if (enabled && !getApps().length) {
  initializeApp({projectId: "demo-lurems-scheduling"});
}

async function fixture() {
  const db = getFirestore();
  const prefix = crypto.randomUUID();
  const ids = {
    psychologist: `${prefix}-psych`,
    patient: `${prefix}-patient`,
    therapist: `${prefix}-therapist`,
    therapy: `${prefix}-therapy`,
    appointment: `${prefix}-appointment`,
    old: `${prefix}-old`,
    next: `${prefix}-next`,
  };
  const start = c.timestamp("2030-01-07", "09:00");
  const appointment = {
    pacienteUid: ids.patient,
    terapeutaId: ids.therapist,
    terapiaId: ids.therapy,
    estado: "confirmada",
    fecha: "2030-01-07",
    hora: "09:00",
    endTime: "09:45",
    durationMinutes: 45,
    modalidad: "Remoto",
    ubicacion: "Terapia Online",
    startsAt: Timestamp.fromMillis(start),
    endsAt: Timestamp.fromMillis(start + 45 * c.MINUTE),
    availabilitySlotId: ids.old,
    bookingId: ids.appointment,
    paymentStatus: "approved",
    revision: 0,
    ...reminderFields(start),
  };
  const booking = {
    patientId: ids.patient,
    psychologistId: ids.therapist,
    psychologistUid: ids.psychologist,
    terapiaId: ids.therapy,
    slotId: ids.old,
    status: "confirmed",
    paymentStatus: "approved",
    date: "2030-01-07",
    startTime: "09:00",
    endTime: "09:45",
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
  };
  const batch = db.batch();
  batch.set(db.collection("users").doc(ids.patient), {
    roles: ["patient"],
  });
  batch.set(db.collection("users").doc(ids.psychologist), {
    roles: ["psychologist"],
  });
  batch.set(db.collection("therapists").doc(ids.therapist), {
    uid: ids.psychologist,
    activo: true,
    sessionPriceAmount: 10000,
  });
  batch.set(db.collection("terapias").doc(ids.therapy), {
    pacienteUid: ids.patient,
    terapeutaId: ids.therapist,
    estado: "activo",
    citas: [],
  });
  batch.set(db.collection("citas").doc(ids.appointment), appointment);
  batch.set(db.collection("bookings").doc(ids.appointment), booking);
  batch.set(db.collection("payments").doc(ids.appointment), {
    status: "approved",
  });
  batch.set(db.collection("payment_accounts").doc(ids.therapist), {
    status: "connected",
    provider: "mercado_pago",
    isFake: true,
    providerAccountId: `fake-seller-${ids.therapist}`,
  });
  for (const [id, date, status] of [
    [ids.old, "2030-01-07", "booked"],
    [ids.next, "2030-01-08", "available"],
  ]) {
    batch.set(db.collection("therapist_availability").doc(id), {
      therapistId: ids.therapist,
      date,
      startTime: "09:00",
      endTime: "09:45",
      durationMinutes: 45,
      bufferMinutes: 15,
      status,
      modality: "Remoto",
      location: "Terapia Online",
      ...(status === "booked" ?
        {appointmentId: ids.appointment, bookingId: ids.appointment} :
        {}),
    });
  }
  await batch.commit();
  const config = getPaymentConfig({
    APP_ENVIRONMENT: "development",
    PAYMENT_PROVIDER: "mercado_pago",
    PAYMENT_ENVIRONMENT: "sandbox",
    PAYMENT_USE_FAKE_PROVIDER: "true",
  });
  return {
    db,
    ids,
    service: new SchedulingService(db, () => now),
    payments: new MarketplacePaymentService({
      db,
      config,
      provider: new FakeMarketplacePaymentProvider(config),
    }),
    read: async (collection, id) =>
      (await db.collection(collection).doc(id).get()).data(),
  };
}

test(
    "simultaneous projections do not create overlapping blocks",
    {skip: !enabled},
    async () => {
      const f = await fixture();
      const data = {
        therapistId: f.ids.therapist,
        fromDate: "2030-01-09",
        toDate: "2030-01-09",
        publish: true,
        settings: {
          durationMinutes: 45,
          bufferMinutes: 15,
          windows: [
            {
              day: 3,
              startTime: "09:00",
              endTime: "12:00",
              modality: "Remoto",
            },
          ],
        },
      };
      const results = await Promise.all([
        f.service.project(f.ids.psychologist, data),
        f.service.project(f.ids.psychologist, data),
      ]);
      assert.deepEqual(results.map((r) => r.count).sort(), [0, 3]);
      const preview = await f.service.project(f.ids.psychologist, {
        ...data,
        publish: false,
      });
      assert.equal(preview.conflicts, 3);
    },
);

test(
    "rescheduling atomically moves the appointment, booking and both slots",
    {skip: !enabled},
    async () => {
      const f = await fixture();
      await f.service.mutateAppointment(f.ids.patient, {
        citaId: f.ids.appointment,
        action: "reschedule",
        slotId: f.ids.next,
        revision: 0,
      });
      const a = await f.read("citas", f.ids.appointment);
      const b = await f.read("bookings", f.ids.appointment);
      assert.equal(a.fecha, "2030-01-08");
      assert.equal(a.startsAt.toMillis(), b.startsAt.toMillis());
      assert.equal(b.slotId, f.ids.next);
      assert.equal(a.durationMinutes, 45);
      assert.equal(a.paymentStatus, "approved");
      assert.equal(a.estado, "confirmada");
      assert.equal(
          (await f.read("therapist_availability", f.ids.old)).status,
          "available",
      );
      assert.equal(
          (await f.read("therapist_availability", f.ids.next)).status,
          "booked",
      );
      assert.equal(a.scheduleVersion, 2);
      await assert.rejects(
          f.service.mutateAppointment(f.ids.psychologist, {
            citaId: f.ids.appointment,
            action: "details",
            revision: 0,
          }),
          /cambió/,
      );
    },
);

test(
    "occupied destinations and different paid " +
        "durations leave the old reservation intact",
    {skip: !enabled},
    async () => {
      const f = await fixture();
      await f.db
          .collection("therapist_availability")
          .doc(f.ids.next)
          .update({durationMinutes: 60});
      await assert.rejects(
          f.service.mutateAppointment(f.ids.patient, {
            citaId: f.ids.appointment,
            action: "reschedule",
            slotId: f.ids.next,
          }),
          /duración/,
      );
      assert.equal(
          (await f.read("citas", f.ids.appointment)).fecha,
          "2030-01-07",
      );
      assert.equal(
          (await f.read("therapist_availability", f.ids.old)).status,
          "booked",
      );
    },
);

test(
    "cancellation racing rescheduling always releases the current slot",
    {skip: !enabled},
    async () => {
      const f = await fixture();
      const results = await Promise.allSettled([
        f.service.mutateAppointment(f.ids.patient, {
          citaId: f.ids.appointment,
          action: "reschedule",
          slotId: f.ids.next,
        }),
        f.service.cancelReservation(f.ids.patient, {
          citaId: f.ids.appointment,
        }),
      ]);
      assert.equal(results[1].status, "fulfilled");
      assert.equal(
          (await f.read("citas", f.ids.appointment)).estado,
          "cancelada",
      );
      assert.equal(
          (await f.read("therapist_availability", f.ids.old)).status,
          "available",
      );
      assert.equal(
          (await f.read("therapist_availability", f.ids.next)).status,
          "available",
      );
    },
);

test(
    "patients cannot close sessions and " +
        "psychologists cannot close future sessions",
    {skip: !enabled},
    async () => {
      const f = await fixture();
      const action = {
        citaId: f.ids.appointment,
        action: "status",
        estado: "realizada",
      };
      await assert.rejects(
          f.service.mutateAppointment(f.ids.patient, action),
          /psicólogo/,
      );
      await assert.rejects(
          f.service.mutateAppointment(f.ids.psychologist, action),
          /finalización/,
      );
      const after = new SchedulingService(f.db, () =>
        c.timestamp("2030-01-07", "09:45"),
      );
      await after.mutateAppointment(f.ids.psychologist, action);
      assert.equal(
          (await f.read("bookings", f.ids.appointment)).status,
          "completed",
      );
      assert.equal(
          (await f.read("bookings", f.ids.appointment)).payoutEligible,
          true,
      );
      await assert.rejects(
          after.cancelReservation(f.ids.patient, {
            citaId: f.ids.appointment,
          }),
          /estado/,
      );
    },
);

test(
    "days off preserve paid or held slots and " +
        "public responses omit patient identifiers",
    {skip: !enabled},
    async () => {
      const f = await fixture();
      const result = await f.service.closeSlots(f.ids.psychologist, {
        therapistId: f.ids.therapist,
        fromDate: "2030-01-07",
        toDate: "2030-01-08",
      });
      assert.deepEqual(result, {closed: 1, reserved: 1});
      await assert.rejects(
          f.service.closeSlots(f.ids.psychologist, {
            therapistId: f.ids.therapist,
            slotId: f.ids.old,
          }),
          /reservarse/,
      );
      await assert.rejects(
          f.service.listSlots(f.ids.patient, {
            therapistId: f.ids.therapist,
            includeReserved: true,
          }),
          /privada/,
      );
      const listing = await f.service.listSlots(f.ids.patient, {
        therapistId: f.ids.therapist,
      });
      assert.equal(listing.slots.length, 0);
    },
);

test(
    "reminders are delivered once per " +
        "schedule version and stop after cancellation",
    {skip: !enabled},
    async () => {
      const f = await fixture();
      const reminderService = new SchedulingService(f.db, () =>
        c.timestamp("2030-01-06", "10:00"),
      );
      await Promise.all([
        reminderService.sendReminders(),
        reminderService.sendReminders(),
      ]);
      let notifications = await f.db
          .collection("notifications")
          .where("recipientUid", "==", f.ids.patient)
          .get();
      assert.equal(notifications.size, 1);
      await reminderService.sendReminders();
      notifications = await f.db
          .collection("notifications")
          .where("recipientUid", "==", f.ids.patient)
          .get();
      assert.equal(notifications.size, 1);
      await reminderService.cancelReservation(f.ids.patient, {
        citaId: f.ids.appointment,
      });
      const beforeSession = new SchedulingService(f.db, () =>
        c.timestamp("2030-01-07", "08:00"),
      );
      await beforeSession.sendReminders();
      assert.equal(
          (await f.read("citas", f.ids.appointment)).nextReminderAt,
          null,
      );
    },
);

test(
    "two patients cannot hold the same " +
        "slot, and closing it cannot override the hold",
    {skip: !enabled},
    async () => {
      const f = await fixture();
      const other = `${f.ids.patient}-other`;
      await f.db
          .collection("users")
          .doc(other)
          .set({roles: ["patient"]});
      const results = await Promise.allSettled([
        f.payments.createBookingHold(f.ids.patient, {slotId: f.ids.next}),
        f.payments.createBookingHold(other, {slotId: f.ids.next}),
      ]);
      assert.equal(
          results.filter((r) => r.status === "fulfilled").length,
          1,
      );
      await assert.rejects(
          f.service.closeSlots(f.ids.psychologist, {
            therapistId: f.ids.therapist,
            slotId: f.ids.next,
          }),
          /reservarse/,
      );
    },
);

test(
    "late payment after cancellation never resurrects the appointment",
    {skip: !enabled},
    async () => {
      const f = await fixture();
      const b = await f.payments.createBookingHold(f.ids.patient, {
        slotId: f.ids.next,
      });
      const payment = await f.read("payments", b.id);
      const providerPaymentId = `${b.id}-charge`;
      await f.db
          .collection("payments")
          .doc(b.id)
          .update({providerPaymentId});
      await f.service.cancelReservation(f.ids.patient, {bookingId: b.id});
      const result = await f.payments.processPaymentProviderEvent({
        providerEventId: `${b.id}-event`,
        providerPaymentId,
        status: "approved",
        grossAmount: payment.grossAmount,
        currency: "PEN",
        externalReference: payment.externalReference,
      });
      assert.equal(result.refundRequired, true);
      assert.equal(
          (await f.db.collection("citas").doc(b.id).get()).exists,
          false,
      );
      assert.equal(
          (await f.read("therapist_availability", f.ids.next)).status,
          "available",
      );
    },
);
