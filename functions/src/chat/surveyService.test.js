/* eslint-disable max-len */
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {memoryFirestore} = require("./testing/memoryFirestore");
const {createSurveyService} = require("./surveyService");
const {makeTurn} = require("./surveyTurn");
const {createAdmissionControl, keyFor, reservationFor} = require("../ai/admissionControl");
const {admissionPolicy} = require("../ai/admissionPolicy");
const {AIProviderInvalidResponseError} = require("../ai/errors");
const {confirmProfileSummary} = require("./profileChatHandlers");
const firestoreAdmin = require("firebase-admin/firestore");
const CLOCK = Date.parse("2026-10-31T12:00:00Z");
const limits = () => ({version: "synthetic", requestsPerDay: 30, globalConcurrency: 2});
const silent = {info() {}, warn() {}};
function fixture({config = {}, generate, chatLimits = limits, clock = () => CLOCK, authorize} = {}) {
  const db = memoryFirestore();
  let calls = 0;
  const policy = () => admissionPolicy({AI_ADMISSION_LIMITS_JSON: JSON.stringify({version: "test", periodId: "2026-10", startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-11-01T00:00:00Z", accountInferenceLimit: 10, budgetNanoUsd: 100000000, pricingVersion: "openai-standard-2026-10-31", ...config})});
  const admission = createAdmissionControl({db, now: clock, policy});
  const events = [];
  const service = createSurveyService({db, now: clock, limits: chatLimits, admission, authorize,
    telemetry: {info: (name, entry) => events.push({name, ...entry}), warn: silent.warn},
    generate: async (input) => {
      calls++; return generate ? generate(input) : {data: {temas: ["Ansiedad"]}, usage: {inputTokens: 100, outputTokens: 50}, model: "gpt-6-luna"};
    }});
  return {db, service, admission, events, get calls() {
    return calls;
  }};
}
function deferred() {
  let resolve; const promise = new Promise((r) => {
    resolve = r;
  }); return {promise, resolve};
}
function seed(db, uid = "participant", profile = {}) {
  const activeTurn = makeTurn(profile, "session-1");
  db.seed(`conversations/${uid}`, {activeSessionId: "session-1", sessionStartedAt: new Date(CLOCK), activeTurn});
  db.seed(`profiles/${uid}`, profile);
  return activeTurn;
}
const request = (id, message = "Texto sintético de admisión") => ({requestId: id, message});
async function chip(service, uid, turn, id, label) {
  const option = turn.options.find((o) => o.label === label) || turn.options[0];
  return service.send(uid, {...request(id, option.value), turnId: turn.id, sessionId: turn.sessionId, option});
}

test("concurrent retry, transaction callback replay and completed retry invoke the provider once", async () => {
  const started = deferred(); const finish = deferred();
  const f = fixture({generate: async () => {
    started.resolve(); return finish.promise;
  }});
  seed(f.db); f.db.metrics.replays = 1;
  const data = request("concurrent-1");
  const pending = f.service.send("participant", data);
  await started.promise;
  await assert.rejects(f.service.send("participant", data), {code: "aborted"});
  await assert.rejects(f.service.send("participant", request("concurrent-2")), {code: "aborted"});
  finish.resolve({data: {temas: ["Ansiedad"]}, usage: {inputTokens: 100, outputTokens: 50}});
  const result = await pending;
  assert.deepEqual(await f.service.send("participant", data), result);
  assert.equal(f.calls, 1);
  assert.equal([...f.db.records.keys()].filter((p) => p.includes("/messages/")).length, 2);
  assert.equal(f.db.records.get("ai_usage_periods/2026-10").inferenceCount, 1);
  assert.equal(f.events.length, 1);
  await assert.rejects(f.service.send("participant", {...data, message: "cambio"}), {code: "already-exists"});
});

test("exhausted AI and total-turn allocation preserve guided completion and summary confirmation", async (t) => {
  const f = fixture({config: {accountInferenceLimit: 0}, chatLimits: () => ({...limits(), requestsPerDay: 1})});
  seed(f.db);
  const denied = await f.service.send("participant", request("exhausted-1"));
  assert.equal(denied.aiAvailability.reason, "account_ai_exhausted");
  assert.equal(denied.suggestedOptions.length > 0, true);
  let result = denied;
  for (const [index, label] of ["Ansiedad", "Online", "Me da igual", "Me da igual", "Me da igual"].entries()) result = await chip(f.service, "participant", result.activeTurn, `guided-${index}`, label);
  assert.equal(result.summaryRequired, true);
  assert.equal(result.readyForRecommendations, false);
  assert.equal(result.activeTurn.status, "complete");
  assert.equal(f.calls, 0);
  // Exercise the existing handler; replace only its account-access read with a fixture.
  const originalDoc = f.db.doc;
  f.db.doc = (path) => path === "users/participant" ? {get: async () => ({data: () => ({roles: ["patient"], fechaNacimiento: "1990-01-01", patientOnboardingStatus: "complete", legalAcceptance: {version: "unit-v1", termsUrl: "https://example.test/terms", privacyUrl: "https://example.test/privacy", acceptedAt: "synthetic"}})})} : originalDoc(path);
  t.mock.method(firestoreAdmin, "getFirestore", () => f.db);
  const env = {FUNCTIONS_EMULATOR: "true", GCLOUD_PROJECT: "demo-unit", ELIGIBILITY_POLICY_JSON: JSON.stringify({version: "unit-v1", minimumAge: 18, ageBasis: "declared_birth_date", timeZone: "America/Lima", status: "synthetic", approvalReference: "fixture"}), LEGAL_DOCUMENT_VERSION: "unit-v1", LEGAL_TERMS_URL: "https://example.test/terms", LEGAL_PRIVACY_URL: "https://example.test/privacy"};
  const previousEnv = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const confirmed = await confirmProfileSummary({auth: {uid: "participant", token: {email_verified: true}}, data: {sessionId: result.sessionId}});
  assert.equal(confirmed.readyForRecommendations, true);
});

test("global budget blocks another account while a provider call is in flight; guided turns ignore AI concurrency", async () => {
  const started = deferred(); const finish = deferred();
  let policyBudget;
  const f = fixture({generate: async (payload) => {
    policyBudget = reservationFor(payload).reservedNanoUsd; started.resolve(); return finish.promise;
  }, chatLimits: () => ({...limits(), globalConcurrency: 1})});
  seed(f.db, "a"); seed(f.db, "b"); seed(f.db, "c");
  const pending = f.service.send("a", request("global-one"));
  await started.promise;
  assert.ok(f.db.records.get("ai_usage_periods/2026-10").reservedNanoUsd === policyBudget);
  const denied = await f.service.send("b", request("global-two"));
  assert.equal(denied.aiAvailability.reason, "ai_busy");
  const turn = f.db.records.get("conversations/c").activeTurn;
  const guided = await chip(f.service, "c", turn, "global-chip", "Ansiedad");
  assert.equal(guided.activeTurn.field, "modalidad");
  finish.resolve({data: {}, usage: {inputTokens: 100, outputTokens: 50}});
  await pending;
  assert.equal(f.calls, 1);
});

test("provider failure keeps unknown reservation, rejects same operation replay and permits guided recovery", async () => {
  const f = fixture({generate: async () => {
    throw new Error("PRIVATE PROVIDER BODY");
  }});
  seed(f.db);
  const data = request("provider-fail");
  await assert.rejects(f.service.send("participant", data), {code: "unavailable"});
  await assert.rejects(f.service.send("participant", data), {code: "failed-precondition"});
  assert.equal(f.calls, 1);
  const usage = f.db.records.get(`ai_usage_operations/${keyFor("participant:provider-fail")}`);
  assert.equal(usage.status, "unconfirmed");
  assert.ok(f.db.records.get("ai_usage_periods/2026-10").reservedNanoUsd > 0);
  assert.equal(JSON.stringify([...f.db.records.values()]).includes("PRIVATE PROVIDER BODY"), false);
  const turn = f.db.records.get("conversations/participant").activeTurn;
  assert.equal((await chip(f.service, "participant", turn, "recovery-chip", "Ansiedad")).activeTurn.field, "modalidad");
});

test("invalid JSON tokens are settled and charged even though the profile answer fails", async () => {
  const f = fixture({generate: async () => {
    throw new AIProviderInvalidResponseError("invalid JSON", {model: "gpt-6-luna", usage: {inputTokens: 100, outputTokens: 700}});
  }});
  seed(f.db);
  await assert.rejects(f.service.send("participant", request("invalid-json")), {code: "unavailable"});
  const period = f.db.records.get("ai_usage_periods/2026-10");
  assert.equal(period.reservedNanoUsd, 0);
  assert.equal(period.spentNanoUsd, 360000);
  assert.equal(period.outputTokens, 700);
});

test("reset or correction during inference discards late data but accounts for spent tokens", async () => {
  const started = deferred(); const finish = deferred();
  const f = fixture({generate: async () => {
    started.resolve(); return finish.promise;
  }});
  seed(f.db);
  const data = request("late-answer");
  const pending = f.service.send("participant", data);
  await started.promise;
  seed(f.db, "participant", {temas: ["Problemas laborales"]});
  f.db.records.get("conversations/participant").activeSessionId = "session-2";
  finish.resolve({data: {temas: ["Ansiedad"]}, usage: {inputTokens: 100, outputTokens: 50}});
  await assert.rejects(pending, {code: "aborted"});
  await assert.rejects(f.service.send("participant", data), {code: "aborted"});
  assert.deepEqual(f.db.records.get("profiles/participant").temas, ["Problemas laborales"]);
  assert.equal(f.db.records.get("ai_usage_periods/2026-10").spentNanoUsd, 35000);
});

test("literal risk bypasses exhausted policies, and admitted contextual signals still show help", async () => {
  const f = fixture({config: {budgetNanoUsd: 0}, chatLimits: () => null});
  seed(f.db);
  const crisis = await f.service.send("participant", request("literal-risk", "quiero suicidarme"));
  assert.equal(crisis.helpMode, true);
  assert.equal(crisis.helpReminder, true);
  assert.equal(f.calls, 0);
  assert.match(crisis.reply, /113/);
  const contextual = fixture({generate: async () => ({riskSignal: "contextual", usage: {inputTokens: 100, outputTokens: 50}})});
  seed(contextual.db);
  const helped = await contextual.service.send("participant", request("context-risk"));
  assert.equal(helped.helpMode, true);
  assert.equal(helped.profile.completado, false);
});

test("control failure, policy absence and complete admission never dispatch paid work", async () => {
  const f = fixture({config: {budgetNanoUsd: 0}}); seed(f.db);
  const denied = await f.service.send("participant", request("zero-budget"));
  assert.equal(denied.aiAvailability.reason, "global_ai_exhausted");
  const complete = {temas: ["Ansiedad"], modalidad: "online", preferenciaGenero: "indiferente", preferenciaEdad: "indiferente", enfoque: "indiferente"};
  seed(f.db, "complete", complete);
  const summary = await f.service.send("complete", request("already-ready"));
  assert.equal(summary.summaryRequired, true);
  assert.equal(f.calls, 0);
  const broken = createSurveyService({db: f.db, limits, telemetry: silent, admission: {reserve: async () => {
    throw new Error("database unavailable");
  }}, generate: async () => assert.fail("must not call")});
  const result = await broken.send("participant", request("broken-control"));
  assert.equal(result.aiAvailability.reason, "controls_unavailable");
});

test("denied free text preserves pending overwrite confirmations and telemetry contains no text", async () => {
  const f = fixture({config: {accountInferenceLimit: 0}});
  seed(f.db, "participant", {temas: ["Ansiedad"], modalidad: "online"});
  const turn = makeTurn({}, "session-1", {field: "modalidad", previous: "online", next: "presencial", data: {modalidad: "presencial"}});
  f.db.records.get("conversations/participant").activeTurn = turn;
  const denied = await f.service.send("participant", request("pending-edit", "PRIVATE CLINICAL TEXT"));
  assert.equal(denied.activeTurn.id, turn.id);
  const applied = await chip(f.service, "participant", denied.activeTurn, "confirm-edit", "Sí, cambiarlo");
  assert.equal(applied.profile.modalidad, "presencial");
  assert.doesNotMatch(JSON.stringify(f.events), /PRIVATE|presencial|Ansiedad|participant|session-1/);
});

test("settlement write failure keeps the reservation and never repeats a paid call", async () => {
  const f = fixture(); seed(f.db);
  const control = {reserve: f.admission.reserve, settle: async () => {
    throw new Error("commit unknown");
  }};
  let calls = 0;
  const service = createSurveyService({db: f.db, now: () => CLOCK, limits, admission: control, telemetry: silent, generate: async () => {
    calls++; return {data: {temas: ["Ansiedad"]}, usage: {inputTokens: 100, outputTokens: 50}};
  }});
  const data = request("failed-settle");
  const result = await service.send("participant", data);
  assert.deepEqual(await service.send("participant", data), result);
  assert.equal(calls, 1);
  assert.equal(f.db.records.get(`ai_usage_operations/${keyFor("participant:failed-settle")}`).status, "reserved");
  assert.ok(f.db.records.get("ai_usage_periods/2026-10").reservedNanoUsd > 0);
});

test("stale lease expiry never replays inference; a new guided request can recover", async () => {
  let time = CLOCK;
  const started = deferred(); const finish = deferred();
  const f = fixture({clock: () => time, generate: async () => {
    started.resolve(); return finish.promise;
  }});
  seed(f.db);
  const data = request("expired-one");
  const pending = f.service.send("participant", data);
  await started.promise;
  time += 91000;
  await assert.rejects(f.service.send("participant", data), {code: "failed-precondition"});
  const turn = f.db.records.get("conversations/participant").activeTurn;
  const guided = await chip(f.service, "participant", turn, "after-expiry", "Ansiedad");
  assert.equal(guided.profile.temas[0], "Ansiedad");
  finish.resolve({data: {temas: ["Depresión"]}, usage: {inputTokens: 100, outputTokens: 50}});
  await assert.rejects(pending, {code: "aborted"});
  assert.equal(f.calls, 1);
  assert.equal(f.db.records.get("profiles/participant").temas[0], "Ansiedad");
});

test("provider timeout is bounded by remaining admission time and provider approval precedes reservation", async () => {
  let time = CLOCK;
  const f = fixture({clock: () => time, generate: async (payload) => {
    assert.equal(payload.timeoutMs, 15000); return {data: {}};
  }});
  seed(f.db);
  const control = {settle: f.admission.settle, reserve: async (claim) => {
    const ticket = await f.admission.reserve(claim); time += 30000; return ticket;
  }};
  const service = createSurveyService({db: f.db, now: () => time, limits, admission: control, telemetry: silent, generate: async (payload) => {
    assert.equal(payload.timeoutMs, 15000); return {data: {}};
  }});
  await service.send("participant", request("bounded-time"));
  const {HttpsError} = require("firebase-functions/v2/https");
  const blocked = fixture({authorize: () => {
    throw new HttpsError("failed-precondition", "provider denied", {reason: "provider_unavailable"});
  }});
  seed(blocked.db);
  await assert.rejects(blocked.service.send("participant", request("approval-fail")), {code: "unavailable"});
  assert.equal(blocked.calls, 0);
  assert.equal(blocked.db.records.has("ai_usage_periods/2026-10"), false);
});

test("accounts for the extra ledger operations instead of claiming universal backend savings", async () => {
  const ai = fixture(); seed(ai.db);
  await ai.service.send("participant", request("measure-ai"));
  assert.equal(ai.db.metrics.reads, 16);
  assert.equal(ai.db.metrics.writes, 16);
  const guided = fixture(); const turn = seed(guided.db);
  await chip(guided.service, "participant", turn, "measure-chip", "Ansiedad");
  assert.equal(guided.db.metrics.reads, 7);
  assert.equal(guided.db.metrics.writes, 9);
  assert.equal(guided.db.metrics.historyDocuments, 0);
});
