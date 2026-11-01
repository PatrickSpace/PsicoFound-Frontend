/* eslint-disable max-len */
const {test, afterEach, mock} = require("node:test");
const assert = require("node:assert/strict");
const firestore = require("firebase-admin/firestore");
const {ACTIVITY_WINDOW_MS, recordAccountActivity, latestActivity, activityIndexPatch} = require("./accountLifecycle");
afterEach(() => mock.restoreAll());

function setup(initial) {
  const state = {user: initial, reads: 0, writes: 0, now: Date.parse("2026-10-31T12:00:00Z")};
  mock.method(Date, "now", () => state.now);
  mock.method(firestore.FieldValue, "serverTimestamp", () => firestore.Timestamp.fromMillis(state.now));
  // Serialization models a retried transaction observing the committed value.
  let pending = Promise.resolve();
  mock.method(firestore, "getFirestore", () => ({doc: () => ({}), runTransaction: (fn) => {
    const next = pending.then(() => fn({get: async () => {
      state.reads++; return {data: () => state.user};
    }, update: (_, data) => {
      state.writes++; state.user = {...state.user, ...data};
    }}));
    pending = next;
    return next;
  }}));
  return state;
}

test("concurrent calls and calls within 15 minutes share one write while every operation reads current access", async () => {
  const state = setup({accountStatus: "active"});
  await Promise.all(Array.from({length: 20}, () => recordAccountActivity("person")));
  assert.equal(state.reads, 20);
  assert.equal(state.writes, 1);
  const first = state.user.lastActivityAt;
  state.now += ACTIVITY_WINDOW_MS - 1;
  await recordAccountActivity("person");
  assert.equal(state.user.lastActivityAt, first);
  assert.equal(state.writes, 1);
  assert.ok(latestActivity(state.user) > state.now);
  state.now++;
  await recordAccountActivity("person");
  assert.equal(state.writes, 2);
});

test("suspension and unknown states remain visible during the window and do not write or reactivate", async () => {
  const state = setup({accountStatus: "active"});
  await recordAccountActivity("person");
  for (const status of ["suspended", "deleting", "disabled"]) {
    state.user = {...state.user, accountStatus: status};
    assert.equal((await recordAccountActivity("person")).accountStatus, status);
    assert.equal(state.writes, 1);
  }
  state.user = undefined;
  assert.equal(await recordAccountActivity("missing"), undefined);
  assert.equal(state.writes, 1);
});

test("legacy activity and independent financial activity establish a conservative window", async () => {
  const state = setup({lastActivityAt: "2026-10-31T11:59:00Z"});
  await recordAccountActivity("person");
  assert.equal(state.user.accountStatus, "active");
  assert.equal(state.writes, 1);
  state.now += ACTIVITY_WINDOW_MS + 1000;
  state.user.lastActivityAt = firestore.Timestamp.fromMillis(state.now);
  await recordAccountActivity("person");
  assert.equal(state.writes, 2);
  assert.equal(latestActivity(state.user), state.now + ACTIVITY_WINDOW_MS);
});

test("index preparation is idempotent, preserves historical activity and never changes restricted states", () => {
  const patch = activityIndexPatch({createdAt: "2020-01-01", lastActivityAt: "2021-01-01"});
  assert.equal(patch.lastActivityAt.toMillis(), Date.parse("2021-01-01"));
  assert.equal(patch.accountStatus, "active");
  assert.deepEqual(activityIndexPatch(patch), {});
  assert.equal(activityIndexPatch({}).lastActivityAt.toMillis(), 0);
  assert.deepEqual(activityIndexPatch({accountStatus: "suspended"}), {});
  assert.deepEqual(activityIndexPatch({accountStatus: "future-status"}), {});
});
