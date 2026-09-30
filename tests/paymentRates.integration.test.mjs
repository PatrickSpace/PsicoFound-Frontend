import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase/app";
import {
  connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore,
  collection, setDoc, updateDoc, terminate, setLogLevel,
} from "firebase/firestore";

const require = createRequire(import.meta.url);
const admin = require("../functions/node_modules/firebase-admin");
const { savePaymentRate, setPsychologistPaymentRate } = require("../functions/src/payments/paymentRateHandlers.js");
const projectId = "demo-lurems-rates";
const clients = new Map();
let adminApp;
let db;
const ratePayload = (rateId, amountMinor = 11000) => ({
  rateId, expectedVersion: 0, name: "Prueba emulador", amountMinor,
  paymentUrl: "https://mpago.la/emulator-only", active: true, isTest: true,
});
const adminCall = (data) => ({ auth: { uid: "admin" }, data });
const denied = (error) => error.code === "permission-denied";

before(async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST || "", /^(127\.0\.0\.1|localhost):\d+$/,
    "Run via npm run test:payment-rules. Production access is forbidden.");
  process.env.GCLOUD_PROJECT = projectId;
  adminApp = admin.initializeApp({ projectId });
  db = admin.firestore();
  for (const [uid, roles] of [
    ["admin", ["admin"]], ["psychologist", ["psychologist"]],
    ["other", ["psychologist"]], ["patient", ["patient"]],
  ]) {
    await db.doc(`users/${uid}`).set({ roles });
  }
  await db.doc("users/legacy").set({ rol: "psicologo" });
  await db.doc("therapists/professional").set({ uid: "psychologist", activo: true, nombre: "Prueba" });
  await db.doc("citas/existing").set({ pacienteUid: "patient", amountMinor: 12000, estado: "confirmada" });
  await savePaymentRate(adminCall(ratePayload("standard")));
  await savePaymentRate(adminCall(ratePayload("premium", 12000)));
  setLogLevel("silent");
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  for (const uid of ["admin", "psychologist", "other", "patient", "legacy", "guest"]) {
    const app = initializeApp({ projectId, apiKey: "emulator-only" }, `rates-${uid}`);
    const firestore = getFirestore(app);
    connectFirestoreEmulator(firestore, host, Number(port), uid === "guest" ? {} : {
      mockUserToken: { sub: uid, user_id: uid },
    });
    clients.set(uid, { app, firestore });
  }
});

after(async () => {
  for (const { app, firestore } of clients.values()) {
    await terminate(firestore);
    await deleteApp(app);
  }
  if (adminApp) await adminApp.delete();
});

test("catalog reads are limited to admins and professionals, including legacy roles", async () => {
  for (const uid of ["admin", "psychologist", "legacy"]) {
    const snapshot = await getDocs(collection(clients.get(uid).firestore, "payment_rates"));
    assert.equal(snapshot.size, 2);
  }
  for (const uid of ["patient", "guest"]) {
    await assert.rejects(getDocs(collection(clients.get(uid).firestore, "payment_rates")), denied);
  }
});

test("all clients are denied direct catalog and version writes", async () => {
  for (const uid of ["admin", "psychologist", "patient"]) {
    const client = clients.get(uid).firestore;
    await assert.rejects(updateDoc(doc(client, "payment_rates/standard"), { amountMinor: 1 }), denied);
    await assert.rejects(setDoc(doc(client, "payment_rates/standard/versions/fake"), { version: 99 }), denied);
  }
});

test("professional selection cannot be forged through direct profile edits", async () => {
  for (const uid of ["admin", "psychologist", "patient"]) {
    await assert.rejects(updateDoc(doc(clients.get(uid).firestore, "therapists/professional"), { paymentRateId: "premium" }), denied);
  }
  await updateDoc(doc(clients.get("admin").firestore, "therapists/professional"), { description: "Perfil editado" });
  await assert.rejects(setDoc(doc(clients.get("admin").firestore, "therapists/forged"), {
    uid: "admin", paymentRateId: "premium",
  }), denied);
});

test("concurrent edits produce one version and reject the stale request", async () => {
  const requests = ["Cambio A", "Cambio B"].map((name) => savePaymentRate(adminCall({
    ...ratePayload("standard"), expectedVersion: 1, name,
  })));
  const results = await Promise.allSettled(requests);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.code, "aborted");
  const versions = await db.collection("payment_rates/standard/versions").get();
  assert.equal(versions.size, 2);
  assert.equal((await db.doc("payment_rates/standard/versions/1").get()).data().name, "Prueba emulador");
});

test("selection is audited, private to its owner/admin and leaves old appointments unchanged", async () => {
  await setPsychologistPaymentRate({ auth: { uid: "psychologist" }, data: {
    therapistId: "professional", rateId: "premium", expectedRateVersion: 1, expectedSelectionVersion: 0,
  } });
  for (const uid of ["admin", "psychologist"]) {
    assert.equal((await getDoc(doc(clients.get(uid).firestore, "therapists/professional/rate_history/1"))).exists(), true);
  }
  for (const uid of ["patient", "other"]) {
    await assert.rejects(getDoc(doc(clients.get(uid).firestore, "therapists/professional/rate_history/1")), denied);
  }
  await assert.rejects(getDoc(doc(clients.get("psychologist").firestore, "payment_rates/standard/versions/1")), denied);
  assert.equal((await getDoc(doc(clients.get("admin").firestore, "payment_rates/standard/versions/1"))).exists(), true);
  assert.deepEqual((await db.doc("citas/existing").get()).data(), {
    pacienteUid: "patient", amountMinor: 12000, estado: "confirmada",
  });
});
