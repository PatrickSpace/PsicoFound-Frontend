import { adminApps, adminFirestore } from "./helpers/admin-sdk.mjs";
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, terminate, setLogLevel } from "firebase/firestore";
import { accounts, projectId } from "./helpers/followup-fixtures.mjs";
import { httpCall, seedPatient, seedSlots, seedPastAppointment, reserve } from "./helpers/patient-http.mjs";

let app, db;
const clients = new Map();
const denied = { code: "permission-denied" };
before(async () => {
  app = await seedPatient(); db = adminFirestore.getFirestore(app);
  setLogLevel("silent");
  for (const who of ["A", "B", "C", "X"]) {
    const client = initializeApp({ projectId, apiKey: "synthetic" }, `patient-${who}`);
    const fs = getFirestore(client);
    connectFirestoreEmulator(fs, "127.0.0.1", 8080, { mockUserToken: { sub: accounts[who].uid, user_id: accounts[who].uid } });
    clients.set(who, { app: client, db: fs });
  }
});
beforeEach(async () => { await seedPatient(); });
after(async () => {
  for (const client of clients.values()) { await terminate(client.db); await deleteApp(client.app); }
  await adminApps.deleteApp(app);
});
const emotion = (overrides = {}) => ({ mode: "patient", terapiaId: "b-active", requestId: "emotion-test",
  mood: "Tranquilo/a", intensity: 5, energy: 6, sleepQuality: 7, note: "Compartido", tags: ["Trabajo"], ...overrides });

test("REV-PAC-01/02: HTTP emotion identity, association, active state, atomic history and readers", async () => {
  for (const who of ["X", "C", "A"]) {
    await assert.rejects(httpCall(who, "createEmotionalCheckin", emotion()), denied);
  }
  for (const forged of [{ pacienteNombre: "Falso" }, { createdBy: accounts.A.uid },
    { authorName: "Falso" }, { pacienteUid: accounts.C.uid }, { terapeutaId: "therapist-d" }]) {
    await assert.rejects(httpCall("B", "createEmotionalCheckin", emotion(forged)), denied);
  }
  await assert.rejects(httpCall("B", "createEmotionalCheckin", emotion({ terapiaId: "b-old" })), { code: "failed-precondition" });
  await assert.rejects(httpCall("A", "createEmotionalCheckin", emotion({ mode: "psychologist" })), denied);
  await assert.rejects(setDoc(doc(clients.get("X").db, "emotional_checkins/forged"), {
    pacienteUid: accounts.X.uid, terapiaId: "b-active", terapeutaId: "therapist-a",
    pacienteNombre: accounts.B.nombre, createdBy: accounts.B.uid,
  }), denied);
  const result = await httpCall("B", "createEmotionalCheckin", emotion());
  assert.deepEqual(await httpCall("B", "createEmotionalCheckin", emotion()), result);
  await assert.rejects(httpCall("B", "createEmotionalCheckin", emotion({ note: "Changed retry" })), { code: "aborted" });
  for (const who of ["B", "A"]) {
    const saved = (await getDoc(doc(clients.get(who).db, `emotional_checkins/${result.id}`))).data();
    assert.equal(saved.pacienteUid, accounts.B.uid);
    assert.equal(saved.pacienteNombre, accounts.B.nombre);
    assert.equal(saved.createdBy, accounts.B.uid);
    assert.equal(saved.authorName, accounts.B.nombre);
    assert.equal(saved.terapeutaNombre, accounts.A.nombre);
    assert.equal(saved.note, "Compartido");
  }
  for (const who of ["C", "X"]) await assert.rejects(getDoc(doc(clients.get(who).db, `emotional_checkins/${result.id}`)), denied);
  assert.equal((await db.collection("longitudinal_history").where("sourceId", "==", result.id).get()).size, 1);
  const personal = await httpCall("A", "createEmotionalCheckin", emotion({ terapiaId: "a-personal" }));
  assert.equal((await db.doc(`emotional_checkins/${personal.id}`).get()).data().terapeutaId, "therapist-d");
});

test("REV-PAC-02: no client history events; real completed transition retries exactly once via HTTP", async () => {
  for (const eventType of ["appointment_completed", "therapy_status_changed", "emotional_checkin_created", "goal_created", "exercise_completed"]) {
    await assert.rejects(setDoc(doc(clients.get("B").db, `longitudinal_history/fake-${eventType}`), {
      terapiaId: "b-active", pacienteUid: accounts.B.uid, eventType, sourceId: "nonexistent", createdBy: accounts.B.uid,
    }), denied);
  }
  await seedPastAppointment(db, "confirmada");
  const appointmentId = "past-open";
  const data = { mode: "psychologist", appointmentId, status: "realizada", expectedVersion: 1,
    attendedAt: "2020-01-01T15:00:00Z", requestId: "complete-real", sessionSummary: "Sesión sintética" };
  await httpCall("A", "changeAppointmentStatus", data);
  await httpCall("A", "changeAppointmentStatus", data);
  const events = await db.collection("longitudinal_history").where("sourceId", "==", appointmentId).get();
  const completed = events.docs.map(d => d.data()).filter(e => e.eventType === "appointment_completed");
  assert.equal(completed.length, 1);
  assert.equal(completed[0].metadata.status, "realizada");
  assert.equal((await db.doc(`citas/${appointmentId}`).get()).data().estado, "realizada");
});

for (const status of ["pendiente", "confirmada"]) {
  test(`REV-PAC-03: past ${status}, explicit cancellation releases all blockers`, async () => {
    await seedSlots(db); await seedPastAppointment(db, status);
    await assert.rejects(reserve(), { code: "already-exists" });
    await assert.rejects(httpCall("B", "changeTherapyStatus", { mode: "patient", therapyId: "b-active", status: "pausado", requestId: "blocked-pause" }), { code: "failed-precondition" });
    await httpCall("B", "changeAppointmentStatus", { mode: "patient", appointmentId: "past-open",
      status: "cancelada", requestId: "cancel-past" });
    assert.equal((await db.doc("citas/past-open").get()).data().estado, "cancelada");
    const therapy = (await db.doc("terapias/b-active").get()).data();
    assert.equal(therapy.citas[0].estado, "cancelada");
    assert.equal(therapy.citas[0].paymentStatus, "cancelled");
    const slot = (await db.doc("therapist_availability/past-slot").get()).data();
    assert.equal(slot.status, "available"); assert.ok(!slot.appointmentId);
    assert.equal((await db.doc("payment_operations/past-open").get()).data().status, "cancelled");
    assert.equal((await db.collection("longitudinal_history").where("sourceId", "==", "past-open").get()).size, 1);
    assert.equal((await db.collection("notifications").where("recipientUid", "==", accounts.A.uid).get()).size, 1);
    await httpCall("B", "changeTherapyStatus", { mode: "patient", therapyId: "b-active", status: "pausado", requestId: "pause-resolved" });
    await httpCall("B", "changeTherapyStatus", { mode: "patient", therapyId: "b-active", status: "activo", requestId: "resume-resolved" });
    await reserve("review-ten", "reserve-after-resolution");
  });
}

test("REV-PAC-04: HTTP reservation crosses day; reschedule respects DST and ignores patient zone", async () => {
  await seedSlots(db, "2099-01-15");
  await db.doc("therapist_availability/review-ten").update({ startTime: "23:30", endTime: "23:59" });
  await db.doc("therapist_availability/review-fourteen").update({ date: "2099-07-15", startTime: "12:00", timeZone: "Europe/Madrid" });
  const { appointmentId } = await reserve();
  assert.equal((await db.doc(`citas/${appointmentId}`).get()).data().startAtIso, "2099-01-16T04:30:00.000Z");
  await httpCall("B", "rescheduleAppointment", { mode: "patient", appointmentId,
    availabilitySlotId: "review-fourteen", requestId: "dst-reschedule", timeZone: "America/Lima" });
  const saved = (await db.doc(`citas/${appointmentId}`).get()).data();
  assert.equal(saved.startAtIso, "2099-07-15T10:00:00.000Z");
  assert.equal(saved.timeZone, "America/Lima");
  assert.equal(saved.hora, "05:00");
  const summary = (await db.doc("terapias/b-active").get()).data().citas.find(c => c.citaId === appointmentId);
  assert.equal(summary.startAtIso, saved.startAtIso); assert.equal(summary.timeZone, saved.timeZone);
  const notices = (await db.collection("notifications").get()).docs.map(d => d.data());
  assert.ok(notices.some(n => n.message.includes("2099-07-15 · 05:00 · hora de Lima")));
});

for (const paymentStatus of ["pending", "confirmed"]) {
  test(`professional rejects confirmed appointment with a reason; ${paymentStatus} payment keeps its financial handling`, async () => {
    await seedSlots(db);
    const {appointmentId} = await reserve();
    await httpCall("A", "changeAppointmentStatus", {mode: "psychologist", appointmentId,
      status: "confirmada", requestId: "confirm-before-rejection"});
    if (paymentStatus === "confirmed") {
      await httpCall("B", "markPaymentSubmitted", {operationId: appointmentId});
      await httpCall("review-admin", "reviewPaymentOperation", {operationId: appointmentId,
        status: "confirmed", providerReference: "paid-before-professional-rejection"});
    }
    const data = {mode: "psychologist", appointmentId, status: "cancelada",
      reason: "Tuve un percance y no podré atenderte.", expectedVersion: 2, requestId: "reject-professional"};
    await assert.rejects(httpCall("A", "changeAppointmentStatus", {...data, expectedVersion: 1}), {code: "aborted"});
    await assert.rejects(httpCall("A", "changeAppointmentStatus", {...data, reason: "   "}), {code: "invalid-argument"});
    await assert.rejects(httpCall("D", "changeAppointmentStatus", data), {code: "permission-denied"});
    const result = await httpCall("A", "changeAppointmentStatus", data);
    assert.deepEqual(await httpCall("A", "changeAppointmentStatus", data), result);
    await assert.rejects(httpCall("A", "changeAppointmentStatus", {...data, reason: "Otro motivo"}), {code: "already-exists"});
    const saved = (await db.doc(`citas/${appointmentId}`).get()).data();
    assert.equal(saved.estado, "cancelada");
    assert.equal(saved.cancellationReason, data.reason);
    assert.equal(saved.cancellationActorMode, "psychologist");
    assert.equal(saved.rescheduleRequested, true);
    const therapy = (await db.doc("terapias/b-active").get()).data();
    const summary = therapy.citas.find(item => item.citaId === appointmentId);
    assert.equal(summary.rescheduleRequested, true);
    assert.equal(summary.cancellationReason, data.reason);
    const slot = (await db.doc("therapist_availability/review-ten").get()).data();
    assert.equal(slot.status, "closed");
    assert.equal(slot.appointmentId, "");
    const financialStatus = paymentStatus === "confirmed" ? "refund_review" : "cancelled";
    assert.equal((await db.doc(`payment_operations/${appointmentId}`).get()).data().status, financialStatus);
    assert.equal(summary.paymentStatus, financialStatus);
    if (paymentStatus === "confirmed") {
      assert.equal((await db.doc(`professional_obligations/${appointmentId}`).get()).data().status, "refund_review");
    }
    const notices = (await db.collection("notifications").where("recipientUid", "==", accounts.B.uid).get())
      .docs.map(doc => doc.data()).filter(item => item.type === "appointment_rejected");
    assert.equal(notices.length, 1);
    assert.match(notices[0].message, /Tuve un percance/);
    assert.match(notices[0].message, /Elige un nuevo horario/);
    assert.equal(notices[0].route, "/sesiones");
    const replacement = await reserve("review-fourteen", "replacement-after-rejection");
    assert.notEqual(replacement.appointmentId, appointmentId);
    assert.equal((await db.doc(`citas/${appointmentId}`).get()).data().estado, "cancelada");
    assert.equal((await db.doc(`payment_operations/${appointmentId}`).get()).data().status, financialStatus);
  });
}

test("professional can reject a late confirmed appointment despite patient cutoffs, but cannot reject a completed session", async () => {
  await seedPastAppointment(db, "confirmada");
  await httpCall("A", "changeAppointmentStatus", {mode: "psychologist", appointmentId: "past-open",
    status: "cancelada", reason: "Un percance requiere otro horario.", expectedVersion: 1, requestId: "late-professional-rejection"});
  assert.equal((await db.doc("therapist_availability/past-slot").get()).data().status, "closed");
  await assert.rejects(httpCall("A", "changeAppointmentStatus", {mode: "psychologist",
    appointmentId: "session-b-active", status: "cancelada", expectedVersion: 1,
    reason: "No se debe cancelar una sesión realizada.", requestId: "reject-completed-session"}), {code: "permission-denied"});
});

test("attendance completion, correction and undo preserve audit, financial data and access", async () => {
  await seedPastAppointment(db, "confirmada");
  const id = "past-open";
  const paymentBefore = (await db.doc(`payment_operations/${id}`).get()).data();
  const complete = {mode: "psychologist", appointmentId: id, status: "realizada", expectedVersion: 1,
    attendedAt: "2020-01-01T15:00:00Z", sessionSummary: "Resumen original", requestId: "attendance-complete"};
  await httpCall("A", "changeAppointmentStatus", complete);
  await httpCall("A", "changeAppointmentStatus", complete);
  const original = (await db.doc(`citas/${id}`).get()).data();
  const therapyAtCompletion = (await db.doc("terapias/b-active").get()).data();
  assert.equal(therapyAtCompletion.citas.find(item => item.citaId === id).completedAt, original.completedAt.toDate().toISOString());
  const correction = {...complete, sessionAction: "correct", expectedVersion: 2,
    attendedAt: "2020-01-01T15:20:00Z", sessionSummary: "Resumen corregido",
    reason: "Corregí la hora y el resumen", requestId: "attendance-correction"};
  for (const who of ["B", "D", "review-admin"]) await assert.rejects(httpCall(who, "changeAppointmentStatus", correction), {code: "permission-denied"});
  await assert.rejects(httpCall("A", "changeAppointmentStatus", {...correction, reason: ""}), {code: "invalid-argument"});
  await httpCall("A", "changeAppointmentStatus", correction);
  const corrected = (await db.doc(`citas/${id}`).get()).data();
  assert.equal(corrected.completedAt.toMillis(), original.completedAt.toMillis());
  assert.equal(corrected.completedBy, accounts.A.uid);
  assert.equal(corrected.attendedAt, "2020-01-01T15:20:00.000Z");
  const undo = {mode: "psychologist", appointmentId: id, status: "confirmada", sessionAction: "undo",
    expectedVersion: 3, reason: "La sesión no ocurrió", confirmNotAttended: true, requestId: "attendance-undo"};
  await httpCall("A", "changeAppointmentStatus", undo);
  await httpCall("A", "changeAppointmentStatus", undo);
  const undone = (await db.doc(`citas/${id}`).get()).data();
  assert.equal(undone.estado, "confirmada");
  assert.equal(undone.attendedAt, null);
  assert.equal(undone.sessionSummary, "");
  assert.deepEqual((await db.doc(`payment_operations/${id}`).get()).data(), paymentBefore);
  const revisions = (await db.collection("longitudinal_history").where("sourceId", "==", id).get())
    .docs.map(doc => doc.data()).filter(event => event.metadata?.attendanceChange);
  assert.equal(revisions.length, 3);
  const revision = revisions.find(event => event.eventType === "appointment_attendance_corrected").metadata.attendanceChange;
  assert.equal(revision.before.sessionSummary, "Resumen original");
  assert.equal(revision.after.sessionSummary, "Resumen corregido");
  assert.equal(revision.actorUid, accounts.A.uid);
  const event = await getDoc(doc(clients.get("B").db, `longitudinal_history/${id}_appointment_attendance_corrected_attendance-correction`));
  assert.equal(event.exists(), true);
  await assert.rejects(getDoc(doc(clients.get("X").db, event.ref.path)), denied);
  assert.equal((await db.collection("notifications").where("recipientUid", "==", accounts.B.uid).get()).size, 3);
});

test("attendance cannot precede scheduled start, undo cannot bypass another open reservation", async () => {
  await seedSlots(db);
  const {appointmentId} = await reserve();
  await httpCall("A", "changeAppointmentStatus", {mode: "psychologist", appointmentId,
    status: "confirmada", requestId: "attendance-future-confirm"});
  await assert.rejects(httpCall("A", "changeAppointmentStatus", {mode: "psychologist", appointmentId,
    status: "realizada", attendedAt: new Date().toISOString(), expectedVersion: 2,
    sessionSummary: "", requestId: "attendance-future"}), {code: "failed-precondition"});
  await assert.rejects(httpCall("A", "changeAppointmentStatus", {mode: "psychologist", appointmentId: "session-b-active",
    status: "confirmada", sessionAction: "undo", expectedVersion: 1,
    reason: "Registro por error", confirmNotAttended: true, requestId: "undo-with-open"}), {code: "failed-precondition"});
});
