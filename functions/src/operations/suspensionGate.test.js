/* eslint-disable max-len, prefer-arrow-callback */
// Named handlers exercise the same operation gates as deployed callables.
const {test, afterEach, mock} = require("node:test");
const assert = require("node:assert/strict");
const https = require("firebase-functions/v2/https");
const firestore = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");
const originalEmulator = process.env.FUNCTIONS_EMULATOR;
const originalProject = process.env.GCLOUD_PROJECT;
afterEach(() => {
  mock.restoreAll();
  for (const [key, value] of [["FUNCTIONS_EMULATOR", originalEmulator], ["GCLOUD_PROJECT", originalProject]]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function wrapped(handler, accountStatus = "suspended", accessBlocked = false) {
  mock.method(https, "onCall", (options, callback) => callback);
  for (const method of ["info", "warn"]) mock.method(logger, method, () => {});
  const snapshot = (ref) => ({exists: true, data: () =>
    ref.path.startsWith("users/") ? {accountStatus} : ref.path.startsWith("account_requests/") ? {accessBlocked} : {}});
  const db = {
    doc: (path) => ({path, get: async () => snapshot({path})}),
    runTransaction: async (fn) => fn({get: async (ref) => snapshot(ref), update: () => {}}),
  };
  mock.method(firestore, "getFirestore", () => db);
  delete require.cache[require.resolve("./callable")];
  return require("./callable").onCall(handler);
}
const request = {auth: {uid: "person"}};

test("valid existing sessions cannot mutate through callables after suspension", async () => {
  let called = false;
  const callable = wrapped(async function updateOwnProfile() {
    called = true;
  });
  await assert.rejects(callable(request), (error) => error.code === "permission-denied" && error.details.reason === "account_suspended");
  assert.equal(called, false);
});

test("suspended users can inspect access and export; deletion access blocks remain authoritative", async () => {
  const callable = wrapped(async function getAccountAccessStatus() {
    return "suspended";
  });
  assert.equal(await callable(request), "suspended");
  mock.restoreAll();
  const exportData = wrapped(async function exportOwnData() {
    return "owned-data";
  });
  assert.equal(await exportData(request), "owned-data");
  mock.restoreAll();
  const blocked = wrapped(async function exportOwnData() {
    throw Error("must not execute");
  }, "suspended", true);
  await assert.rejects(blocked(request), {code: "permission-denied"});
});

test("legacy deletion operations cannot run in production, including with a policy configured", async () => {
  process.env.FUNCTIONS_EMULATOR = "false";
  process.env.GCLOUD_PROJECT = "psicosaas-3c819";
  let called = false;
  const callable = wrapped(async function executeAccountDeletion() {
    called = true;
  }, "active");
  await assert.rejects(callable(request), {code: "failed-precondition"});
  assert.equal(called, false);
  process.env.FUNCTIONS_EMULATOR = "true";
  await assert.rejects(callable(request), {code: "failed-precondition"});
  assert.equal(called, false);
});
