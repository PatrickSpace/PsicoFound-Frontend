import { createRequire } from "node:module";
import { syntheticCommercial } from "./pilot-policy.mjs";
const require = createRequire(import.meta.url);
const {validateCommercialPolicy} = require("../../functions/src/payments/commercialPolicy");
import { adminAuth, adminFirestore } from "./admin-sdk.mjs";
import assert from "node:assert/strict";
import { accounts, password, projectId, seedFollowup } from "./followup-fixtures.mjs";

export async function httpCall(who, name, data) {
  assert.equal(process.env.GCLOUD_PROJECT, projectId);
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  assert.match(host || "", /^127\.0\.0\.1:9099$/);
  const uid = accounts[who]?.uid || who;
  const login = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic-only`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `${uid}@example.test`, password, returnSecureToken: true }),
  });
  assert.equal(login.ok, true, `Synthetic authentication failed for ${uid}`);
  const { idToken } = await login.json();
  const response = await fetch(`http://127.0.0.1:5001/${projectId}/southamerica-east1/${name}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw Object.assign(new Error(payload.error?.message || `HTTP ${response.status}`),
      { code: payload.error?.status?.toLowerCase().replaceAll("_", "-") });
  }
  return payload.result;
}

export async function seedPatient() {
  const app = await seedFollowup();
  const db = adminFirestore.getFirestore(app);
  try {
    await adminAuth.getAuth(app).createUser({ uid: "review-admin", email: "review-admin@example.test",
      password, emailVerified: true });
  } catch (error) {
    if (error.code !== "auth/uid-already-exists") throw error;
    await adminAuth.getAuth(app).updateUser("review-admin", { emailVerified: true, password });
  }
  await db.doc("users/review-admin").set({ roles: ["admin"], nombre: "Administrador sintético",
    legalAcceptance: {version: "review-2026-10-06", termsUrl: "https://example.test/terms",
      privacyUrl: "https://example.test/privacy", acceptedAt: "2026-10-09"} });
  await db.doc("users/patient-b").update({ fechaNacimiento: "1991-02-03", telefono: "999000111",
    pais: "España", zonaHoraria: "Europe/Madrid" });
  await db.doc("profiles/patient-b").set({ temas: ["Ansiedad"], motivoConsulta: "Motivo sintético",
    modalidad: "remoto", preferenciaGenero: "Indiferente", preferenciaEdad: "Indiferente",
    enfoque: "Indiferente", riesgoSuicida: false, completado: true });
  await db.doc("therapists/therapist-a").update({ especialidades: ["Ansiedad"], modalidades: ["Remoto"],
    direccion: "Terapia Online", paymentRateId: "review-rate", paymentRateSelectionVersion: 1 });
  await db.doc("payment_rates/review-rate").set({ name: "Tarifa sintética", amountMinor: 12000,
    currency: "PEN", version: 1, active: true, isTest: true, platformPercent: 30,
    psychologistPercent: 70, paymentUrl: "https://example.test/synthetic-payment" });
  return app;
}

export async function seedSlots(db, date = new Date(Date.now() + 86400000).toISOString().slice(0, 10)) {
  for (const [id, startTime, endTime] of [["review-ten", "10:00", "11:00"], ["review-fourteen", "14:00", "15:00"]]) {
    await db.doc(`therapist_availability/${id}`).set({ therapistId: "therapist-a", date,
      startTime, endTime, durationMinutes: 60, timeZone: "America/Lima",
      modality: "Remoto", location: "Terapia Online", status: "available" });
  }
  return date;
}

export async function reserve(slot = "review-ten", requestId = "patient-reserve") {
  const quote = await httpCall("B", "getBookingQuote", { therapistId: "therapist-a" });
  return httpCall("B", "reserveAppointment", { mode: "patient", terapeutaId: "therapist-a",
    terapiaId: "b-active", availabilitySlotId: slot, requestId, quoteId: quote.quoteId });
}

export async function seedPastAppointment(db, status) {
  const appointment = { citaId: "past-open", id: "past-open", terapiaId: "b-active",
    pacienteUid: accounts.B.uid, pacienteNombre: accounts.B.nombre, terapeutaId: "therapist-a",
    terapeutaNombre: accounts.A.nombre, fecha: "2020-01-01", hora: "10:00", timeZone: "America/Lima",
    startAtIso: "2020-01-01T15:00:00.000Z", estado: status, modalidad: "Remoto",
    availabilitySlotId: "past-slot", paymentOperationId: "past-open", paymentStatus: "pending",
    paymentSnapshot: {commercialPolicy: validateCommercialPolicy(syntheticCommercial)} };
  await db.doc("citas/past-open").set(appointment);
  await db.doc("terapias/b-active").update({ citas: [appointment] });
  await db.doc("therapist_availability/past-slot").set({ therapistId: "therapist-a", date: "2020-01-01",
    startTime: "10:00", timeZone: "America/Lima", status: "booked", bookedBy: accounts.B.uid, appointmentId: "past-open" });
  await db.doc("payment_operations/past-open").set({ patientUid: accounts.B.uid, status: "pending",
    therapistId: "therapist-a", appointmentId: "past-open", therapyId: "b-active", amountMinor: 12000, currency: "PEN",
    rateSnapshot: appointment.paymentSnapshot, expiresAt: adminFirestore.Timestamp.fromMillis(Date.now() + 3600000) });
  return appointment;
}
