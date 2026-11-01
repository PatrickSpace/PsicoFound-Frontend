import {after, afterEach, test, mock} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {adminApps, adminAuth, adminFirestore} from "./helpers/admin-sdk.mjs";
import {seedPatient} from "./helpers/patient-http.mjs";
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const {suspendInactiveAccounts, recordAccountActivity, normalizeActivityIndex} = require("../functions/src/accounts/accountLifecycle");
let app;
afterEach(() => mock.restoreAll());
after(async () => {
  mock.restoreAll();
  if (app) await adminApps.deleteApp(app);
});

test("inactivity job uses real Firestore transactions, preserves data and skips recent payments", async () => {
  app = await seedPatient();
  const db = adminFirestore.getFirestore(app);
  const auth = adminAuth.getAuth(app);
  for (const uid of ["inactivity-old", "inactivity-paid"]) {
    await auth.createUser({uid, email: `${uid}@example.test`});
    await db.doc(`users/${uid}`).set({roles: ["patient"], accountStatus: "active",
      createdAt: adminFirestore.Timestamp.fromDate(new Date("2020-01-01"))});
    await db.doc(`conversations/${uid}`).set({text: "Synthetic retained conversation"});
  }
  await db.doc("payment_operations/inactivity-recent").set({patientUid: "inactivity-paid",
    status: "confirmed", reconciledAt: adminFirestore.Timestamp.now()});
  // Only historical Auth metadata is synthetic; Firestore queries/transactions
  // and server timestamps use the actual isolated emulator.
  mock.method(adminAuth, "getAuth", () => ({getUser: async (uid) => {
    const user = await auth.getUser(uid);
    return uid.startsWith("inactivity-") ? {...user,
      metadata: {creationTime: "2020-01-01", lastSignInTime: "2020-01-01"}} : user;
  }}));
  const result = await suspendInactiveAccounts();
  assert.equal(result.errors, 0);
  assert.equal(result.suspended, 1);
  const inactive = (await db.doc("users/inactivity-old").get()).data();
  assert.equal(inactive.accountStatus, "suspended");
  assert.equal(inactive.suspensionType, "involuntary");
  assert.equal(typeof inactive.suspendedAt.toMillis(), "number");
  assert.equal((await db.doc("conversations/inactivity-old").get()).exists, true);
  assert.equal((await db.doc("users/inactivity-paid").get()).data().accountStatus, "active");
  assert.equal((await db.doc("payment_operations/inactivity-recent").get()).data().status, "confirmed");
});


test("concurrent activity uses one committed window and still observes suspension inside that window", async () => {
  const db = adminFirestore.getFirestore(app);
  const ref = db.doc("users/cost-window");
  await ref.set({accountStatus: "active", createdAt: adminFirestore.Timestamp.now()});
  const results = await Promise.all(Array.from({length: 20}, () => recordAccountActivity("cost-window")));
  assert.equal(results.filter((user) => !user.lastActivityAt).length, 1);
  const first = await ref.get();
  assert.ok(first.data().activityWindowUntil.toMillis() > first.data().lastActivityAt.toMillis());
  await Promise.all(Array.from({length: 20}, () => recordAccountActivity("cost-window")));
  const second = await ref.get();
  assert.equal(second.updateTime.toMillis(), first.updateTime.toMillis());
  await ref.update({accountStatus: "suspended"});
  const suspended = await ref.get();
  assert.equal((await recordAccountActivity("cost-window")).accountStatus, "suspended");
  assert.equal((await ref.get()).updateTime.toMillis(), suspended.updateTime.toMillis());
});

test("canonical candidates paginate beyond 200 while archived history is covered by one bounded compatibility page", async () => {
  const db = adminFirestore.getFirestore(app);
  const auth = adminAuth.getAuth(app);
  const batch = db.batch();
  // Missing Auth users also verify error handling for canonical candidates
  // independently of their position in the compatibility sweep.
  for (let i = 0; i < 201; i++) batch.set(db.doc(`users/cost-candidate-${i}`), {
    accountStatus: "active", lastActivityAt: adminFirestore.Timestamp.fromMillis(1),
  });
  await batch.commit();
  const original = auth.getUser.bind(auth);
  mock.method(adminAuth, "getAuth", () => ({getUser: async (uid) => {
    if (uid.startsWith("cost-candidate-")) return {metadata: {creationTime: new Date().toISOString()}};
    return original(uid);
  }}));
  const result = await suspendInactiveAccounts();
  assert.equal(result.errors, 0);
  assert.ok(result.skipped >= 201);
  for (const id of ["0", "199", "200"]) {
    assert.equal((await db.doc(`users/cost-candidate-${id}`).get()).data().accountStatus, "active");
  }
  assert.equal((await db.doc("runtime_controls/inactivity_legacy_scan").get()).exists, true);
});

test("preparation is idempotent and preserves fresh activity under concurrent normalization", async () => {
  const db = adminFirestore.getFirestore(app);
  const ref = db.doc("users/cost-legacy");
  await ref.set({createdAt: "2020-01-01", lastActivityAt: "2021-01-01", nombre: "Synthetic"});
  await Promise.all([normalizeActivityIndex(db, ref), recordAccountActivity("cost-legacy")]);
  const prepared = await ref.get();
  assert.equal(prepared.data().accountStatus, "active");
  assert.ok(prepared.data().lastActivityAt.toMillis() > Date.parse("2021-01-01"));
  assert.equal(prepared.data().nombre, "Synthetic");
  await normalizeActivityIndex(db, ref);
  assert.equal((await ref.get()).updateTime.toMillis(), prepared.updateTime.toMillis());
});


test("operator preparation defaults to dry run and can be resumed and reapplied", async () => {
  const {prepareActivityIndex} = require("../functions/scripts/prepareActivityIndex");
  const db = adminFirestore.getFirestore(app);
  const ref = db.doc("users/zzcost-legacy");
  await ref.set({createdAt: "2020-01-01", nombre: "Synthetic"});
  const before = await ref.get();
  const options = {after: "zzcost-", pages: 1};
  const dry = await prepareActivityIndex(db, options);
  assert.equal(dry.pending, 1);
  assert.equal(dry.done, true);
  assert.equal((await ref.get()).updateTime.toMillis(), before.updateTime.toMillis());
  await prepareActivityIndex(db, {...options, apply: true});
  const result = (await ref.get()).data();
  assert.equal(result.lastActivityAt.toMillis(), Date.parse("2020-01-01"));
  assert.equal(result.accountStatus, "active");
  assert.equal(result.nombre, "Synthetic");
  assert.equal((await prepareActivityIndex(db, {...options, apply: true})).pending, 0);
});
