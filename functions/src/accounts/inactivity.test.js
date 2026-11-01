/* eslint-disable max-len */
const {test, afterEach, mock} = require("node:test");
const assert = require("node:assert/strict");
const firestore = require("firebase-admin/firestore");
const auth = require("firebase-admin/auth");
const logger = require("firebase-functions/logger");
const {suspendInactiveAccounts, activityIndexPatch} = require("./accountLifecycle");
afterEach(() => mock.restoreAll());

function setup(user, {recentPayment = false, signIn = "2020-01-01", changedDuringReview = false,
  paymentDuringTransaction = false, extraUsers = 0, failAuth = false} = {}) {
  const records = new Map([["users/person", user], ["conversations/person", {text: "preserved"}]]);
  for (let i = 0; i < extraUsers; i++) records.set(`users/archived-${String(i).padStart(4, "0")}`, {accountStatus: "suspended"});
  const queries = [];
  const reference = (path) => ({path, id: path.split("/").at(-1), get: async () => snapshot(path),
    set: async (data) => records.set(path, data),
    update: async (data) => records.set(path, {...records.get(path), ...data})});
  const snapshot = (path) => {
    const data = records.get(path);
    return {id: path.split("/").at(-1), ref: reference(path), data: () => data};
  };
  const collection = (path, filters = [], order, maximum = Infinity, cursor) => {
    const query = {path, filters, order, maximum, cursor,
      orderBy: (field) => collection(path, filters, field, maximum, cursor),
      limit: (value) => collection(path, filters, order, value, cursor),
      startAfter: (value) => collection(path, filters, order, maximum, value),
      where: (field, op, value) => collection(path, [...filters, [field, op, value]], order, maximum, cursor),
      doc: () => reference(`${path}/audit`), get: async () => {
        queries.push(query);
        if (path === "users") {
          let rows = [...records.keys()].filter((key) => key.startsWith("users/")).map(snapshot);
          for (const [field, op, value] of filters) {
            rows = rows.filter((doc) => {
              const actual = doc.data()[field];
              return op === "==" ? actual === value : actual instanceof firestore.Timestamp && actual.toMillis() <= value.toMillis();
            });
          }
          rows.sort((a, b) => order === "lastActivityAt" ? a.data().lastActivityAt.toMillis() - b.data().lastActivityAt.toMillis() || a.id.localeCompare(b.id) : a.id.localeCompare(b.id));
          if (cursor) {
            rows = rows.filter((doc) => typeof cursor === "string" ? doc.id > cursor :
            doc.data().lastActivityAt.toMillis() > cursor.data().lastActivityAt.toMillis() ||
            doc.data().lastActivityAt.toMillis() === cursor.data().lastActivityAt.toMillis() && doc.id > cursor.id);
          }
          const docs = rows.slice(0, maximum);
          return {docs, size: docs.length};
        }
        return path === "payment_operations" && recentPayment ? {docs: [{data: () => ({reconciledAt: new Date().toISOString()})}]} : {docs: [], size: 0};
      }};
    return query;
  };
  const db = {doc: reference, collection, runTransaction: async (fn) => {
    if (changedDuringReview && !Object.keys(activityIndexPatch(records.get("users/person"))).length) {
      records.set("users/person", {...records.get("users/person"), lastActivityAt: firestore.Timestamp.now()});
    }
    const writes = new Map();
    const value = await fn({get: async (ref) => ref.get && ref.filters ?
      paymentDuringTransaction && ref.path === "payment_operations" ? {docs: [{data: () => ({updatedAt: new Date().toISOString()})}]} : ref.get() : snapshot(ref.path),
    update: (ref, data) => writes.set(ref.path, {...records.get(ref.path), ...data}),
    create: (ref, data) => writes.set(ref.path, data)});
    writes.forEach((data, path) => records.set(path, data)); return value;
  }};
  mock.method(firestore, "getFirestore", () => db);
  mock.method(auth, "getAuth", () => ({getUser: async () => {
    if (failAuth) throw Error("Auth failure");
    return {metadata: {lastSignInTime: signIn, lastRefreshTime: new Date().toISOString()}};
  }}));
  mock.method(logger, "info", () => {});
  mock.method(logger, "warn", () => {});
  return {records, queries};
}

test("daily review suspends inactive accounts, ignoring background token refresh and preserving records", async () => {
  const {records} = setup({createdAt: "2020-01-01", roles: ["patient"]});
  const result = await suspendInactiveAccounts();
  assert.equal(result.suspended, 1);
  assert.equal(records.get("users/person").suspensionType, "involuntary");
  assert.equal(records.get("users/person").accountStatus, "suspended");
  assert.deepEqual(records.get("conversations/person"), {text: "preserved"});
});

test("recent login, payment or concurrent app activity prevents involuntary suspension", async () => {
  for (const options of [{signIn: new Date().toISOString()}, {recentPayment: true}, {changedDuringReview: true}, {paymentDuringTransaction: true}]) {
    const {records} = setup({createdAt: "2020-01-01", accountStatus: "active"}, options);
    const result = await suspendInactiveAccounts();
    assert.equal(result.suspended, 0);
    assert.equal(records.get("users/person").accountStatus, "active");
    mock.restoreAll();
  }
});

test("review protects administrators and unknown states and flags missing dates", async () => {
  for (const user of [{roles: ["admin"], createdAt: "2020-01-01"}, {accountStatus: "future-status", createdAt: "2020-01-01"}, {}]) {
    const {records} = setup(user, {signIn: null});
    const result = await suspendInactiveAccounts();
    assert.equal(result.suspended, 0);
    if (!Object.keys(user).length) assert.equal(records.get("users/person").inactivityReviewRequired, true);
    mock.restoreAll();
  }
});


test("daily candidate query avoids archived history and compatibility sweep resumes after at most 200 users", async () => {
  const {records, queries} = setup({createdAt: "2020-01-01"}, {extraUsers: 450});
  const first = await suspendInactiveAccounts();
  assert.equal(first.suspended, 0); // This legacy user is after the first bounded page.
  assert.equal(records.get("runtime_controls/inactivity_legacy_scan").cursor, "archived-0199");
  await suspendInactiveAccounts();
  assert.equal(records.get("runtime_controls/inactivity_legacy_scan").cursor, "archived-0399");
  const third = await suspendInactiveAccounts();
  assert.equal(third.suspended, 1);
  assert.equal(records.get("runtime_controls/inactivity_legacy_scan").cursor, null);
  const canonical = queries.filter((q) => q.path === "users" && q.filters.length);
  assert.ok(canonical.every((q) => q.filters[0][0] === "accountStatus" && q.filters[1][0] === "lastActivityAt"));
  assert.ok(queries.filter((q) => q.path === "users").every((q) => q.maximum === 200));
});

test("canonical candidates beyond the compatibility page are processed daily and review failures do not starve migration", async () => {
  const {records} = setup({accountStatus: "active", lastActivityAt: firestore.Timestamp.fromMillis(1)}, {extraUsers: 450, failAuth: true});
  const result = await suspendInactiveAccounts();
  assert.equal(result.errors, 1);
  assert.equal(records.get("runtime_controls/inactivity_legacy_scan").cursor, "archived-0199");
});

test("activity window protects against early suspension at the three-month boundary", async () => {
  const {inactivityCutoff} = require("./accountLifecycle");
  const cutoff = inactivityCutoff();
  const {records} = setup({accountStatus: "active", lastActivityAt: firestore.Timestamp.fromMillis(cutoff - 1),
    activityWindowUntil: firestore.Timestamp.fromMillis(cutoff + 15 * 60000)});
  const result = await suspendInactiveAccounts();
  assert.equal(result.suspended, 0);
  assert.equal(records.get("users/person").accountStatus, "active");
});
