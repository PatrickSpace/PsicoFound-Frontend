/* eslint-disable max-len */
const {test, afterEach, mock} = require("node:test");
const assert = require("node:assert/strict");
const firestoreAdmin = require("firebase-admin/firestore");
const {suspendOwnAccount} = require("./accountHandlers");
const {reactivateOwnAccount, inactivityCutoff, latestActivity,
  recordAccountActivity} = require("./accountLifecycle");

afterEach(() => mock.restoreAll());

function setup(user) {
  const records = new Map([
    ["users/person", user],
    ["therapists/pro", {uid: "person", activo: true, adminVersion: 3}],
    ["citas/session", {estado: "confirmada", pacienteUid: "person"}],
    ["payment_operations/payment", {status: "confirmed"}],
    ["conversations/person", {messages: "preserved"}],
  ]);
  const ref = (path) => ({path});
  const db = {
    doc: ref,
    collection: (path) => ({doc: () => ref(`${path}/audit`), where: () => ({query: path})}),
    runTransaction: async (fn) => {
      const writes = new Map();
      const result = await fn({
        get: async (target) => target.query ? {docs: [{ref: ref("therapists/pro"),
          data: () => records.get("therapists/pro")}]} : {data: () => records.get(target.path)},
        update: (target, data) => writes.set(target.path, {...records.get(target.path), ...data}),
        create: (target, data) => writes.set(target.path, data),
      });
      for (const [path, data] of writes) records.set(path, data);
      return result;
    },
  };
  mock.method(firestoreAdmin, "getFirestore", () => db);
  return records;
}
const request = {auth: {uid: "person"}, data: {confirmation: "SUSPENDER MI CUENTA"}};

test("suspension preserves clinical and financial records, closes professional availability and is idempotent", async () => {
  const records = setup({roles: ["patient", "psychologist"], nombre: "Person"});
  const preserved = ["citas/session", "payment_operations/payment", "conversations/person"]
      .map((path) => [path, structuredClone(records.get(path))]);
  assert.deepEqual(await suspendOwnAccount(request), {status: "suspended"});
  assert.equal(records.get("users/person").accountStatus, "suspended");
  assert.equal(records.get("users/person").nombre, "Person");
  assert.equal(records.get("therapists/pro").activo, false);
  assert.equal(records.get("therapists/pro").adminVersion, 4);
  assert.equal(records.get("admin_audit/audit").action, "account_suspended");
  await suspendOwnAccount(request);
  assert.equal(records.get("therapists/pro").adminVersion, 4);
  for (const [path, data] of preserved) assert.deepEqual(records.get(path), data);
  assert.equal(records.has("account_requests/person_deletion"), false);
});

test("suspension requires authentication, explicit confirmation and protects administrator access", async () => {
  const records = setup({roles: ["admin"], accountStatus: "active"});
  await assert.rejects(suspendOwnAccount({data: request.data}), {code: "unauthenticated"});
  await assert.rejects(suspendOwnAccount({...request, data: {confirmation: "ELIMINAR MI CUENTA"}}), {code: "invalid-argument"});
  await assert.rejects(suspendOwnAccount(request), {code: "failed-precondition"});
  assert.equal(records.get("users/person").accountStatus, "active");
  assert.equal(records.get("therapists/pro").activo, true);
});

test("suspension does not overwrite other account states or create a missing account", async () => {
  for (const user of [undefined, {accountStatus: "deleting"}, {accountStatus: "future-status"}]) {
    const records = setup(user);
    await assert.rejects(suspendOwnAccount(request), {code: user ? "failed-precondition" : "not-found"});
    assert.deepEqual(records.get("users/person"), user);
    mock.restoreAll();
  }
});

test("owner can reactivate both suspension types and restore only the previously active professional profile", async () => {
  for (const type of ["voluntary", "involuntary"]) {
    const records = setup({roles: ["patient", "psychologist"], accountStatus: "suspended", suspensionType: type});
    records.set("therapists/pro", {uid: "person", activo: false, adminVersion: 4,
      accountSuspension: {previousActive: true, version: 4}});
    const input = {...request, data: {confirmation: "REACTIVAR MI CUENTA", uid: "other"}};
    assert.deepEqual(await reactivateOwnAccount(input), {status: "active"});
    assert.equal(records.get("users/person").accountStatus, "active");
    assert.equal(records.get("therapists/pro").activo, true);
    assert.equal(records.get("therapists/pro").adminVersion, 5);
    assert.equal(records.has("users/other"), false);
    await reactivateOwnAccount(input);
    assert.equal(records.get("therapists/pro").adminVersion, 5);
    mock.restoreAll();
  }
});

test("reactivation never reverses a subsequent administrative restriction", async () => {
  const records = setup({roles: ["psychologist"], accountStatus: "suspended", suspensionType: "involuntary"});
  records.set("therapists/pro", {uid: "person", activo: false, adminVersion: 5,
    accountSuspension: {previousActive: true, version: 4}});
  await reactivateOwnAccount({...request, data: {confirmation: "REACTIVAR MI CUENTA"}});
  assert.equal(records.get("users/person").accountStatus, "active");
  assert.equal(records.get("therapists/pro").activo, false);
});

test("reactivation rejects missing authentication, confirmation and non-self-service states", async () => {
  setup({accountStatus: "disabled"});
  await assert.rejects(reactivateOwnAccount({}), {code: "unauthenticated"});
  await assert.rejects(reactivateOwnAccount(request), {code: "invalid-argument"});
  await assert.rejects(reactivateOwnAccount({...request, data: {confirmation: "REACTIVAR MI CUENTA"}}), {code: "failed-precondition"});
});

test("three calendar months clamp month ends and preserve Lima boundary", () => {
  assert.equal(new Date(inactivityCutoff(new Date("2026-05-31T17:00:00Z"))).toISOString(), "2026-02-28T17:00:00.000Z");
  assert.equal(new Date(inactivityCutoff(new Date("2024-05-31T17:00:00Z"))).toISOString(), "2024-02-29T17:00:00.000Z");
  assert.equal(new Date(inactivityCutoff(new Date("2026-06-01T02:00:00Z"))).toISOString(), "2026-03-01T02:00:00.000Z");
  assert.equal(latestActivity({createdAt: "2026-01-01", lastActivityAt: "2026-04-01"},
      {metadata: {lastSignInTime: "2026-09-01"}}), Date.parse("2026-09-01"));
});

test("opening the app refreshes activity but never silently reactivates a suspended account", async () => {
  const records = setup({accountStatus: "active"});
  await recordAccountActivity("person");
  assert.ok(records.get("users/person").lastActivityAt);
  const old = {accountStatus: "suspended", suspensionType: "involuntary", lastActivityAt: "2025-01-01"};
  records.set("users/person", old);
  await recordAccountActivity("person");
  assert.deepEqual(records.get("users/person"), old);
});
