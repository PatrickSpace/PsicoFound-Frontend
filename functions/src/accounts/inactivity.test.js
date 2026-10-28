/* eslint-disable max-len */
const {test, afterEach, mock} = require("node:test");
const assert = require("node:assert/strict");
const firestore = require("firebase-admin/firestore");
const auth = require("firebase-admin/auth");
const logger = require("firebase-functions/logger");
const {suspendInactiveAccounts} = require("./accountLifecycle");
afterEach(() => mock.restoreAll());

function setup(user, {recentPayment = false, signIn = "2020-01-01", changedDuringReview = false} = {}) {
  const records = new Map([["users/person", user], ["conversations/person", {text: "preserved"}]]);
  const reference = (path) => ({path, id: path.split("/").at(-1), update: async (data) => records.set(path, {...records.get(path), ...data})});
  const snapshot = (path) => ({id: path.split("/").at(-1), ref: reference(path), data: () => records.get(path)});
  const collection = (path) => {
    const query = {orderBy: () => query, limit: () => query,
      where: () => query, doc: () => reference(`${path}/audit`),
      get: async () => path === "users" ? {docs: [snapshot("users/person")], size: 1} :
        path === "payment_operations" && recentPayment ? {docs: [{data: () => ({reconciledAt: new Date().toISOString()})}]} : {docs: [], size: 0}};
    return query;
  };
  const db = {doc: reference, collection, runTransaction: async (fn) => {
    if (changedDuringReview) records.set("users/person", {...records.get("users/person"), lastActivityAt: new Date().toISOString()});
    const writes = new Map();
    const value = await fn({get: async (ref) => ref.path ? snapshot(ref.path) : {docs: []},
      update: (ref, data) => writes.set(ref.path, {...records.get(ref.path), ...data}),
      create: (ref, data) => writes.set(ref.path, data)});
    writes.forEach((data, path) => records.set(path, data)); return value;
  }};
  mock.method(firestore, "getFirestore", () => db);
  mock.method(auth, "getAuth", () => ({getUser: async () => ({metadata: {lastSignInTime: signIn, lastRefreshTime: new Date().toISOString()}})}));
  mock.method(logger, "info", () => {});
  mock.method(logger, "warn", () => {});
  return records;
}

test("daily review suspends inactive accounts, ignoring background token refresh and preserving records", async () => {
  const records = setup({createdAt: "2020-01-01", roles: ["patient"]});
  const result = await suspendInactiveAccounts();
  assert.equal(result.suspended, 1);
  assert.equal(records.get("users/person").suspensionType, "involuntary");
  assert.equal(records.get("users/person").accountStatus, "suspended");
  assert.deepEqual(records.get("conversations/person"), {text: "preserved"});
});

test("recent login, payment or concurrent app activity prevents involuntary suspension", async () => {
  for (const options of [{signIn: new Date().toISOString()}, {recentPayment: true}, {changedDuringReview: true}]) {
    const records = setup({createdAt: "2020-01-01", accountStatus: "active"}, options);
    const result = await suspendInactiveAccounts();
    assert.equal(result.suspended, 0);
    assert.equal(records.get("users/person").accountStatus, "active");
    mock.restoreAll();
  }
});

test("review protects administrators and unknown states and flags missing dates", async () => {
  for (const user of [{roles: ["admin"], createdAt: "2020-01-01"}, {accountStatus: "future-status", createdAt: "2020-01-01"}, {}]) {
    const records = setup(user, {signIn: null});
    const result = await suspendInactiveAccounts();
    assert.equal(result.suspended, 0);
    if (!Object.keys(user).length) assert.equal(records.get("users/person").inactivityReviewRequired, true);
    mock.restoreAll();
  }
});
