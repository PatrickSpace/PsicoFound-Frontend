/* eslint-disable max-len */
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {memoryFirestore} = require("../chat/testing/memoryFirestore");
const {createAdmissionControl, keyFor, reservationFor} = require("./admissionControl");
const {admissionPolicy} = require("./admissionPolicy");
const {estimateCostNanoUsd, LUNA_PRICING} = require("./usage");
const CLOCK = Date.parse("2026-10-31T12:00:00Z");
function policy(overrides = {}) {
  return admissionPolicy({AI_ADMISSION_LIMITS_JSON: JSON.stringify({version: "test", periodId: "2026-10", startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-11-01T00:00:00Z", accountInferenceLimit: 10, budgetNanoUsd: 100000000, pricingVersion: LUNA_PRICING.version, ...overrides})});
}
const payload = {messages: [{role: "user", content: "synthetic"}], schema: {type: "object"}};
function prepare(db, uid, requestId = "request-1", sessionId = "session-1") {
  const lease = `lease-${uid}-${requestId}`;
  db.seed(`conversations/${uid}`, {activeSessionId: sessionId, activeTurn: {id: "turn-1"}});
  db.seed(`profile_chat_operations/${uid}_${requestId}`, {status: "processing", lease, leaseUntil: CLOCK + 90000});
  return {uid, requestId, sessionId, turnId: "turn-1", lease, payload, globalConcurrency: 10};
}

test("concurrent reservations cannot spend the same final budget allocation", async () => {
  const db = memoryFirestore();
  const budget = reservationFor(payload).reservedNanoUsd;
  const control = createAdmissionControl({db, now: () => CLOCK, policy: () => policy({budgetNanoUsd: budget})});
  const claims = [prepare(db, "a"), prepare(db, "b")];
  db.metrics.replays = 1;
  const tickets = await Promise.all(claims.map((claim) => control.reserve(claim)));
  assert.equal(tickets.filter((t) => t.allowed).length, 1);
  assert.equal(tickets.find((t) => !t.allowed).reason, "global_ai_exhausted");
  assert.equal(db.records.get("ai_usage_periods/2026-10").reservedNanoUsd, budget);
  assert.equal(db.records.get("ai_usage_periods/2026-10").inferenceCount, 1);
});

test("replayed reservation and concurrent settlement are idempotent, including cached/write tokens", async () => {
  const db = memoryFirestore();
  const control = createAdmissionControl({db, now: () => CLOCK, policy: () => policy()});
  const claim = prepare(db, "a");
  const ticket = await control.reserve(claim);
  assert.equal((await control.reserve(claim)).reason, "inference_already_reserved");
  const usage = {inputTokens: 1000, cachedInputTokens: 400, cacheWriteTokens: 200, outputTokens: 100, totalTokens: 1100};
  await Promise.all([control.settle(ticket, {usage, outcome: "success"}), control.settle(ticket, {usage, outcome: "success"})]);
  const period = db.records.get("ai_usage_periods/2026-10");
  assert.equal(period.reservedNanoUsd, 0);
  assert.equal(period.spentNanoUsd, 119000);
  assert.equal(period.inputTokens, 1000);
  assert.deepEqual(db.records.get("runtime_controls/chat_concurrency").leases, {});
});

test("unknown provider usage keeps the budget reservation and account allocation after session/period reset", async () => {
  const db = memoryFirestore();
  let p = policy({accountInferenceLimit: 1});
  const control = createAdmissionControl({db, now: () => CLOCK, policy: () => p});
  const ticket = await control.reserve(prepare(db, "a"));
  await control.settle(ticket, {outcome: "provider_failure"});
  assert.equal(db.records.get(ticket.usageRef.path).status, "unconfirmed");
  assert.ok(db.records.get(ticket.periodRef.path).reservedNanoUsd > 0);
  p = policy({periodId: "different-period", accountInferenceLimit: 1});
  assert.equal((await control.reserve(prepare(db, "a", "request-2", "session-2"))).reason, "account_ai_exhausted");
  assert.equal(db.records.get(`ai_usage_accounts/${keyFor("a")}`).inferenceCount, 1);
});

test("explicit session allocation, exhausted/invalid/expired policy and period mutation fail closed", async () => {
  assert.equal(admissionPolicy({}), null);
  assert.equal(policy({budgetNanoUsd: -1}), null);
  assert.equal(policy({pricingVersion: "unreviewed"}), null);
  const db = memoryFirestore();
  let p = policy({sessionInferenceLimit: 0});
  const control = createAdmissionControl({db, now: () => CLOCK, policy: () => p});
  const claim = prepare(db, "a");
  assert.equal((await control.reserve(claim)).reason, "account_ai_exhausted");
  p = policy();
  const ticket = await control.reserve(claim);
  await control.settle(ticket, {usage: {inputTokens: 1, outputTokens: 1}, outcome: "success"});
  p = policy({endsAt: "2026-11-02T00:00:00Z"});
  assert.equal((await control.reserve(prepare(db, "a", "request-2"))).reason, "period_configuration_changed");
  p = policy({endsAt: "2026-10-30T00:00:00Z"});
  assert.equal((await control.reserve(prepare(db, "a", "request-3"))).reason, "ai_policy_unavailable");
});

test("stale turn, global concurrency and active lease owner are checked before provider dispatch", async () => {
  const db = memoryFirestore();
  const control = createAdmissionControl({db, now: () => CLOCK, policy: () => policy()});
  const a = prepare(db, "a");
  assert.equal((await control.reserve({...a, turnId: "old-turn"})).reason, "operation_changed");
  await control.reserve({...a, globalConcurrency: 1});
  assert.equal((await control.reserve({...prepare(db, "b"), globalConcurrency: 1})).reason, "ai_busy");
  assert.equal(db.records.has(`ai_usage_accounts/${keyFor("b")}`), false);
});

test("pricing rejects missing/inconsistent usage and includes output reasoning only once", () => {
  assert.equal(estimateCostNanoUsd({}), null);
  assert.equal(estimateCostNanoUsd({inputTokens: 10, cachedInputTokens: 11, outputTokens: 2}), null);
  assert.equal(estimateCostNanoUsd({inputTokens: 10, outputTokens: 20, reasoningTokens: 10}), 11000);
});

test("an operator can lower the shared period cap for already-warm callers", async () => {
  const db = memoryFirestore();
  const control = createAdmissionControl({db, now: () => CLOCK, policy: () => policy()});
  const ticket = await control.reserve(prepare(db, "a"));
  await control.settle(ticket, {usage: {inputTokens: 1, outputTokens: 1}, outcome: "success"});
  db.records.get("ai_usage_periods/2026-10").budgetNanoUsd = 0;
  assert.equal((await control.reserve(prepare(db, "b"))).reason, "global_ai_exhausted");
  assert.equal(db.records.get("ai_usage_periods/2026-10").budgetNanoUsd, 0);
});

test("a crash retains money while expired concurrency leases permit recovery", async () => {
  let time = CLOCK;
  const db = memoryFirestore();
  const control = createAdmissionControl({db, now: () => time, policy: () => policy()});
  const first = await control.reserve({...prepare(db, "a"), globalConcurrency: 1});
  time += 91000;
  const next = prepare(db, "b");
  db.records.get("profile_chat_operations/b_request-1").leaseUntil = time + 90000;
  assert.equal((await control.reserve({...next, globalConcurrency: 1})).allowed, true);
  assert.equal(db.records.get(first.usageRef.path).status, "reserved");
  assert.equal(db.records.get(first.periodRef.path).reservedNanoUsd, reservationFor(payload).reservedNanoUsd * 2);
});

test("missing policy identifiers, ambiguous period times and corrupt balances fail closed", async () => {
  assert.equal(policy({version: undefined}), null);
  assert.equal(policy({periodId: undefined}), null);
  assert.equal(policy({startsAt: "2026-10-01T00:00:00"}), null);
  const db = memoryFirestore();
  db.seed("ai_usage_periods/2026-10", {reservedNanoUsd: -1});
  const control = createAdmissionControl({db, now: () => CLOCK, policy: () => policy()});
  assert.equal((await control.reserve(prepare(db, "a"))).reason, "period_configuration_changed");
  assert.equal(db.records.has(`ai_usage_accounts/${keyFor("a")}`), false);
});
