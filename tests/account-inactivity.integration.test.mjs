import {after, test, mock} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {adminApps, adminAuth, adminFirestore} from "./helpers/admin-sdk.mjs";
import {seedPatient} from "./helpers/patient-http.mjs";
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const {suspendInactiveAccounts} = require("../functions/src/accounts/accountLifecycle");
let app;
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
