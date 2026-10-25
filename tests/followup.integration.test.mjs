import { adminApps, adminAuth, adminFirestore } from "./helpers/admin-sdk.mjs";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, terminate, setLogLevel } from "firebase/firestore";
import { accounts, projectId, seedFollowup } from "./helpers/followup-fixtures.mjs";
const require = createRequire(import.meta.url);
const handlers = require("../functions/src/therapy/followupHandlers.js");
const clients = new Map();
let adminApp;
const call = (who, data) => ({ auth: { uid: accounts[who].uid }, data });
const denied = (error) => error.code === "permission-denied";
before(async () => {
  adminApp = await seedFollowup();
  setLogLevel("silent");
  for (const who of Object.keys(accounts)) {
    const app = initializeApp({ projectId, apiKey: "synthetic" }, `followup-${who}`);
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080, { mockUserToken: { sub: accounts[who].uid, user_id: accounts[who].uid } });
    clients.set(who, { app, db });
  }
});
after(async () => {
  for (const { app, db } of clients.values()) { await terminate(db); await deleteApp(app); }
  if (adminApp) await adminApps.deleteApp(adminApp);
});
test("approved summary requires confirmed consent, including earlier therapies, without private fields", async () => {
  for (const therapyId of ["b-active", "b-old"]) {
    const result = await handlers.getTherapySharedSummary(call("A", { therapyId, mode: "psychologist" }));
    assert.deepEqual(Object.keys(result).sort(), ["historyAvailable", "preferences", "reason", "recordedAt", "source", "status", "topics"]);
    assert.equal(result.status, "available");
    assert.equal(result.reason, "Motivo compartido de B");
    assert.equal(result.recordedAt, "2026-10-21T12:00:00.000Z");
    assert.equal(result.historyAvailable, true);
    assert.equal(result.preferences.enfoque, "Indiferente");
  }
  await assert.rejects(handlers.getTherapySharedSummary(call("A", { therapyId: "c-old", mode: "psychologist" })), denied);
  for (const who of ["D", "X"]) await assert.rejects(handlers.getTherapySharedSummary(call(who, { therapyId: "b-active", mode: "psychologist" })), denied);
  await assert.rejects(getDoc(doc(clients.get("A").db, "profiles/patient-b")), denied);
  await assert.rejects(getDoc(doc(clients.get("A").db, "conversations/patient-b")), denied);
  await assert.rejects(getDoc(doc(clients.get("A").db, "terapias/b-other")), denied);
});
test("survey transcript requires approved payment on the first appointment and disappears when it is cancelled", async () => {
  const db = adminFirestore.getFirestore(adminApp);
  const firstMessage = db.doc(`conversations/${accounts.B.uid}/messages/shared-001`);
  const secondMessage = db.doc(`conversations/${accounts.B.uid}/messages/shared-002`);
  await firstMessage.set({
    role: "user", text: "Mensaje sintético del paciente", sessionId: "survey-session",
    createdAt: adminFirestore.Timestamp.fromDate(new Date("2026-10-21T12:01:00Z")),
  });
  await secondMessage.set({
    role: "assistant", text: "Respuesta empática sintética", sessionId: "survey-session",
    createdAt: adminFirestore.Timestamp.fromDate(new Date("2026-10-21T12:02:00Z")),
  });
  const result = await handlers.getTherapySharedHistory(call("A", {
    therapyId: "b-active", mode: "psychologist", pageSize: 10,
  }));
  assert.equal(result.appointmentId, "survey-share-b-active");
  assert.deepEqual(result.items.map((item) => item.role), ["user", "assistant"]);
  assert.equal(result.items[0].text, "Mensaje sintético del paciente");

  const first = db.doc("citas/survey-share-b-active");
  await first.update({paymentStatus: "submitted"});
  await assert.rejects(handlers.getTherapySharedHistory(call("A", {
    therapyId: "b-active", mode: "psychologist",
  })), denied);

  await first.update({paymentStatus: "confirmed", estado: "cancelada"});
  await db.doc("citas/later-share-b-active").set({
    terapiaId: "b-active", pacienteUid: accounts.B.uid,
    terapeutaId: "therapist-a", estado: "confirmada",
    paymentStatus: "confirmed", surveyHistoryConsent: true,
    fecha: "2026-11-20", hora: "10:00",
  });
  await assert.rejects(handlers.getTherapySharedSummary(call("A", {
    therapyId: "b-active", mode: "psychologist",
  })), denied, "A later paid appointment must not restore access");

  await first.update({estado: "confirmada"});
  await db.doc("citas/later-share-b-active").delete();
  await Promise.all([firstMessage.delete(), secondMessage.delete()]);
});
test("goal progress is atomic, persistent, authored, coherent and rejects stale corrections", async () => {
  const { id } = await handlers.createFollowupGoal(call("A", { mode: "psychologist", terapiaId: "b-active", title: "Integration goal" }));
  for (const [progress, note, expectedVersion] of [[35, "Primera nota", 1], [100, "Segunda nota", 2]]) {
    await handlers.recordGoalProgress(call("A", { mode: "psychologist", goalId: id, progress, note, expectedVersion }));
  }
  const db = clients.get("B").db;
  const saved = (await getDoc(doc(db, `therapy_goals/${id}`))).data();
  assert.equal(saved.status, "achieved");
  assert.equal(saved.progress, 100);
  const entries = await getDocs(collection(db, `therapy_goals/${id}/progress`));
  assert.deepEqual(entries.docs.map((e) => e.data().note), ["Primera nota", "Segunda nota"]);
  for (const entry of entries.docs) { assert.equal(entry.data().authorUid, accounts.A.uid); assert.ok(entry.data().createdAt.toDate()); }
  await assert.rejects(handlers.recordGoalProgress(call("A", { mode: "psychologist", goalId: id, progress: 40, note: "", expectedVersion: 3 })), { code: "invalid-argument" });
  await handlers.recordGoalProgress(call("B", { mode: "patient", goalId: id, progress: 40, note: "Reapertura personal", expectedVersion: 3 }));
  assert.equal((await getDoc(doc(db, `therapy_goals/${id}/progress/4`))).data().kind, "reopened");
  await assert.rejects(handlers.recordGoalProgress(call("A", { mode: "psychologist", goalId: id, progress: 80, note: "obsoleto", expectedVersion: 3 })), { code: "aborted" });
  await assert.rejects(handlers.recordGoalProgress(call("X", { mode: "patient", goalId: id, progress: 50, expectedVersion: 4 })), denied);
  await assert.rejects(getDoc(doc(clients.get("X").db, `therapy_goals/${id}`)), denied);
  await assert.rejects(getDocs(collection(clients.get("X").db, `therapy_goals/${id}/progress`)), denied);
  for (const who of ["A", "B", "X"]) await assert.rejects(updateDoc(doc(clients.get(who).db, `therapy_goals/${id}`), { progress: 99 }), denied);
  const events = await getDocs(query(collection(db, "longitudinal_history"), where("terapiaId", "==", "b-active")));
  assert.equal(events.docs.filter((e) => e.data().sourceId === id).length, 4);
});
test("exercise assignment to completion remains patient-owned and separates identities", async () => {
  const { id } = await handlers.assignFollowupExercise(call("A", { mode: "psychologist", terapiaId: "b-active", title: "Integration exercise", instructions: "Practicar", pacienteUid: accounts.C.uid }));
  assert.equal((await getDoc(doc(clients.get("B").db, `exercises/${id}`))).data().pacienteUid, accounts.B.uid);
  for (const who of ["A", "C", "X"]) await assert.rejects(handlers.completeFollowupExercise(call(who, { mode: "patient", exerciseId: id, patientNotes: "Ajeno" })), denied);
  await handlers.completeFollowupExercise(call("B", { mode: "patient", exerciseId: id, patientNotes: "Me resultó útil" }));
  const saved = (await getDoc(doc(clients.get("A").db, `exercises/${id}`))).data();
  assert.equal(saved.status, "completed"); assert.equal(saved.patientNotes, "Me resultó útil"); assert.ok(saved.completedAt);
  await assert.rejects(getDoc(doc(clients.get("C").db, `exercises/${id}`)), denied);
  await assert.rejects(updateDoc(doc(clients.get("A").db, `exercises/${id}`), { patientNotes: "Reescrito" }), denied);
  await assert.rejects(handlers.completeFollowupExercise(call("B", { mode: "patient", exerciseId: id })), { code: "failed-precondition" });
});
test("inactive therapy is read-only professionally; personal goal actions and dual role stay authorized", async () => {
  await assert.rejects(handlers.createFollowupGoal(call("A", { mode: "psychologist", terapiaId: "b-old", title: "No" })), { code: "failed-precondition" });
  await assert.rejects(handlers.assignFollowupExercise(call("A", { mode: "psychologist", terapiaId: "b-old", title: "No", instructions: "No" })), { code: "failed-precondition" });
  await assert.rejects(handlers.recordGoalProgress(call("A", { mode: "psychologist", goalId: "goal-b-old", progress: 30, expectedVersion: 0 })), { code: "failed-precondition" });
  await handlers.recordGoalProgress(call("B", { mode: "patient", goalId: "goal-b-old", progress: 30, note: "Acción personal conservada", expectedVersion: 0 }));
  const legacy = (await getDoc(doc(clients.get("B").db, "therapy_goals/goal-b-old"))).data();
  assert.equal(legacy.legacyNote, "Nota antigua sin historial");
  assert.equal(legacy.lastNote, "Acción personal conservada");
  assert.equal((await getDocs(collection(clients.get("B").db, "therapy_goals/goal-b-old/progress"))).size, 1);
  await handlers.createFollowupGoal(call("A", { mode: "patient", terapiaId: "a-personal", title: "Personal A" }));
  await assert.rejects(handlers.createFollowupGoal(call("A", { mode: "patient", terapiaId: "b-active", title: "Modo incorrecto" })), denied);
  await assert.rejects(handlers.createFollowupGoal(call("A", { mode: "psychologist", terapiaId: "a-personal", title: "Modo incorrecto" })), denied);
  await assert.rejects(setDoc(doc(clients.get("X").db, "exercises/forged"), { terapiaId: "b-active", pacienteUid: accounts.X.uid }), denied);
  await assert.rejects(updateDoc(doc(clients.get("B").db, "terapias/b-old"), { terapeutaId: "therapist-d" }), denied);
});

test("unlinked direct identifiers and queries are denied for therapy, appointments and history", async () => {
  for (const who of ["C", "D", "X"]) {
    const db = clients.get(who).db;
    for (const path of ["terapias/b-active", "citas/session-b-active", "longitudinal_history/event-b-active"]) {
      await assert.rejects(getDoc(doc(db, path)), denied);
    }
    for (const name of ["therapy_goals", "exercises", "longitudinal_history"]) {
      await assert.rejects(getDocs(query(collection(db, name), where("terapiaId", "==", "b-active"))), denied);
    }
    await assert.rejects(handlers.assignFollowupExercise(call(who, { mode: "psychologist", terapiaId: "b-active", title: "Ajeno", instructions: "Ajeno" })), denied);
    await assert.rejects(setDoc(doc(db, `longitudinal_history/forged-${who}`), {
      terapiaId: "b-active", pacienteUid: accounts[who].uid, createdBy: accounts[who].uid,
      eventType: "emotional_checkin_created",
    }), denied);
  }
  await assert.rejects(setDoc(doc(clients.get("B").db, "longitudinal_history/forged-goal"), {
    terapiaId: "b-active", pacienteUid: accounts.B.uid, createdBy: accounts.B.uid, eventType: "goal_achieved",
  }), denied);
  await assert.rejects(setDoc(doc(clients.get("B").db, "longitudinal_history/personal-checkin"), {
    terapiaId: "b-active", pacienteUid: accounts.B.uid, createdBy: accounts.B.uid, eventType: "emotional_checkin_created",
  }), denied);
  await handlers.createEmotionalCheckin(call("B", {
    mode: "patient", terapiaId: "b-active", requestId: "legitimate-checkin",
    mood: "Tranquilo/a", intensity: 5, energy: 5, sleepQuality: 5, tags: [],
  }));
  await assert.rejects(handlers.createFollowupGoal({ data: { mode: "patient", terapiaId: "b-active", title: "Anónimo" } }), { code: "unauthenticated" });
});

test("REV-PSI-02: seeding verifies new and existing fixture accounts without touching independent unverified accounts", async () => {
  const auth = adminAuth.getAuth(adminApp);
  const created = new Map();
  for (const { uid } of Object.values(accounts)) {
    const user = await auth.getUser(uid);
    assert.equal(user.emailVerified, true);
    created.set(uid, user.metadata.creationTime);
    await auth.updateUser(uid, { emailVerified: false });
  }
  const uid = "followup-unverified-control";
  try { await auth.createUser({ uid, email: `${uid}@example.test`, password: "SyntheticOnly-2026!", emailVerified: false }); }
  catch (error) {
    if (error.code !== "auth/uid-already-exists") throw error;
    await auth.updateUser(uid, { emailVerified: false });
  }
  await seedFollowup();
  for (const { uid } of Object.values(accounts)) {
    const user = await auth.getUser(uid);
    assert.equal(user.emailVerified, true);
    assert.equal(user.metadata.creationTime, created.get(uid), "Reseeding must update, not recreate, Auth users");
  }
  assert.equal((await auth.getUser("followup-unverified-control")).emailVerified, false);
});

test("fixture safety guards reject real projects and nonlocal emulator endpoints before writing", async () => {
  for (const [name, invalid] of [
    ["GCLOUD_PROJECT", "not-the-demo-project"],
    ["FIRESTORE_EMULATOR_HOST", "remote.invalid:8080"],
    ["FIREBASE_AUTH_EMULATOR_HOST", "remote.invalid:9099"],
  ]) {
    const original = process.env[name];
    try {
      process.env[name] = invalid;
      await assert.rejects(seedFollowup(), { code: "ERR_ASSERTION" });
    } finally {
      if (original === undefined) delete process.env[name];
      else process.env[name] = original;
    }
  }
});
