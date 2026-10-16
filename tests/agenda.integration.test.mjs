import { adminApps, adminFirestore } from "./helpers/admin-sdk.mjs";
import { beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, terminate } from "firebase/firestore";
import { seedPatient, httpCall, reserve } from "./helpers/patient-http.mjs";
import { projectId } from "./helpers/followup-fixtures.mjs";
let app, db;
beforeEach(async () => { app = await seedPatient(); db = adminFirestore.getFirestore(app); });
after(async () => (app && adminApps.deleteApp(app)));
const create = (extra = {}) => ({action: "create", mode: "psychologist", therapistId: "therapist-a",
  date: "2099-01-15", startTime: "23:30", timeZone: "America/Lima", requestId: "create-lima", ...extra});
test("HTTP availability policy, permissions, concurrency, retry and direct-write denial", async () => {
  await assert.rejects(httpCall("A", "manageAvailability", create({timeZone: "Europe/Madrid"})), {code: "invalid-argument"});
  await assert.rejects(httpCall("A", "manageAvailability", create({date: "2020-01-01"})), {code: "failed-precondition"});
  await assert.rejects(httpCall("X", "manageAvailability", create()), {code: "permission-denied"});
  await assert.rejects(httpCall("review-admin", "manageAvailability", create({mode: "admin"})), {code: "permission-denied"});
  const results = await Promise.allSettled([httpCall("A", "manageAvailability", create()),
    httpCall("A", "manageAvailability", create({requestId: "concurrent", startTime: "23:45"}))]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  const result = results.find(r => r.status === "fulfilled").value;
  const winner = results[0].status === "fulfilled" ? create() : create({requestId: "concurrent", startTime: "23:45"});
  assert.deepEqual(await httpCall("A", "manageAvailability", winner), result);
  const slot = (await db.doc(`therapist_availability/${result.id}`).get()).data();
  assert.equal(slot.timeZone, "America/Lima"); assert.equal(slot.endDate, "2099-01-16");
  assert.equal(slot.location, "Terapia Online");
  const client = initializeApp({projectId, apiKey: "synthetic"}, "agenda-rules");
  const fs = getFirestore(client);
  connectFirestoreEmulator(fs, "127.0.0.1", 8080, {mockUserToken: {sub: "professional-a", user_id: "professional-a"}});
  try {
    await assert.rejects(setDoc(doc(fs, "therapist_availability/forged"), {...slot,
      startAt: slot.startAt.toDate(), createdAt: slot.createdAt.toDate(), updatedAt: slot.updatedAt.toDate()}), {code: "permission-denied"});
    await assert.rejects(updateDoc(doc(fs, `therapist_availability/${result.id}`), {status: "closed"}), {code: "permission-denied"});
  } finally { await terminate(fs); await deleteApp(client); }
});
test("HTTP legacy slots preserve instants, reject malformed schedules and protect booked appointments", async () => {
  const samples = [
    ["2099-07-15", "12:00", "Europe/Madrid", "2099-07-15T10:00:00.000Z"],
    ["2099-01-15", "12:00", "Europe/Madrid", "2099-01-15T11:00:00.000Z"],
    ["2099-11-01", "01:30", "America/New_York", "2099-11-01T06:30:00.000Z"],
  ];
  for (const [i, [date, startTime, timeZone, iso]] of samples.entries()) {
    const id = `legacy-${i}`;
    const original = {therapistId: "therapist-a", status: "available", date, startTime, timeZone,
      modality: "Remoto", ...(i === 2 ? {startAtIso: iso} : {})};
    await db.doc(`therapist_availability/${id}`).set(original);
    const quote = await httpCall("B", "getBookingQuote", {therapistId: "therapist-a", availabilitySlotId: id});
    assert.equal(quote.schedule.startAtIso, iso);
    await assert.rejects(httpCall("B", "reserveAppointment", {mode: "patient", terapeutaId: "therapist-a",
      terapiaId: "b-active", availabilitySlotId: id, quoteId: quote.quoteId, requestId: `foreign-${i}`, timeZone}), {code: "invalid-argument"});
    const result = await reserve(id, `legacy-reserve-${i}`);
    assert.equal(result.appointment.startAtIso, iso); assert.equal(result.appointment.timeZone, "America/Lima");
    assert.deepEqual(await reserve(id, `legacy-reserve-${i}`), result);
    await assert.rejects(reserve(id, `occupied-${i}`));
    await assert.rejects(httpCall("X", "rescheduleAppointment", {mode: "patient", appointmentId: result.appointmentId,
      availabilitySlotId: id, requestId: `foreign-appointment-${i}`}), {code: "permission-denied"});
    const after = (await db.doc(`therapist_availability/${id}`).get()).data();
    for (const key of ["date", "startTime", "timeZone", "startAtIso"]) assert.equal(after[key], original[key]);
    await httpCall("B", "changeAppointmentStatus", {mode: "patient", appointmentId: result.appointmentId, status: "cancelada", requestId: `cancel-${i}`});
  }
  for (const [id, extra] of Object.entries({past: {date: "2020-01-01", startTime: "10:00"},
    ambiguous: {date: "2099-11-01", startTime: "01:30", timeZone: "America/New_York"},
    invalid: {date: "2099-02-30", startTime: "10:00"},
    contradictory: {date: "2099-01-15", startTime: "10:00", startAtIso: "2099-01-15T18:00:00Z"}})) {
    await db.doc(`therapist_availability/${id}`).set({therapistId: "therapist-a", status: "available", ...extra});
    await assert.rejects(reserve(id, `reject-${id}`), {code: "failed-precondition"});
  }
});

test("HTTP legacy appointment edits preserve its instant; explicit manual rescheduling enforces Lima", async () => {
  const original = {id: "legacy-appointment", citaId: "legacy-appointment", terapiaId: "b-active",
    pacienteUid: "patient-b", terapeutaId: "therapist-a", estado: "pendiente",
    fecha: "2099-07-15", hora: "12:00", timeZone: "Europe/Madrid",
    startAtIso: "2099-07-15T10:00:00.000Z", modalidad: "Remoto"};
  await db.doc("citas/legacy-appointment").set(original);
  await db.doc("terapias/b-active").update({citas: [original]});
  await httpCall("A", "updateAppointmentDetails", {mode: "psychologist", appointmentId: original.id,
    requestId: "legacy-details", notas: "Detalle sin reprogramación"});
  let appointment = (await db.doc(`citas/${original.id}`).get()).data();
  for (const key of ["fecha", "hora", "timeZone", "startAtIso"]) assert.equal(appointment[key], original[key]);
  const summary = (await db.doc("terapias/b-active").get()).data().citas[0];
  assert.equal(summary.startAtIso, original.startAtIso);
  assert.equal(summary.hora, "05:00"); assert.equal(summary.timeZone, "America/Lima");
  const changes = {mode: "psychologist", appointmentId: original.id, requestId: "manual-reschedule",
    fecha: "2099-07-16", hora: "12:00", timeZone: "Europe/Madrid"};
  await assert.rejects(httpCall("A", "rescheduleAppointment", changes), {code: "invalid-argument"});
  await assert.rejects(httpCall("A", "rescheduleAppointment", {...changes, timeZone: "America/Lima", fecha: "2020-01-01"}), {code: "failed-precondition"});
  const result = await httpCall("A", "rescheduleAppointment", {...changes, timeZone: "America/Lima"});
  assert.deepEqual(await httpCall("A", "rescheduleAppointment", {...changes, timeZone: "America/Lima"}), result);
  appointment = (await db.doc(`citas/${original.id}`).get()).data();
  assert.equal(appointment.startAtIso, "2099-07-16T17:00:00.000Z");
  assert.equal(appointment.timeZone, "America/Lima");
});
