/* eslint-disable max-len */
const {test} = require("node:test");
const assert = require("node:assert/strict");
const firestore = require("firebase-admin/firestore");
const {memoryFirestore} = require("./testing/memoryFirestore");
const {surveyAttemptCount} = require("./surveyAttempts");
const {startProfileChatConversation, resetProfileChatConversation} = require("./profileChatHandlers");
const {admissionPolicy} = require("../ai/admissionPolicy");

test("attempts preserve legacy sessions, allow resuming at the cap and reject malformed counters", () => {
  assert.equal(surveyAttemptCount({}, true), 1);
  assert.equal(surveyAttemptCount({activeSessionId: "legacy"}), 1);
  assert.equal(surveyAttemptCount({activeSessionId: "legacy"}, true), 2);
  assert.equal(surveyAttemptCount({surveyAttemptCount: 10}), 10);
  assert.throws(() => surveyAttemptCount({surveyAttemptCount: 10}, true), {code: "resource-exhausted"});
  assert.throws(() => surveyAttemptCount({surveyAttemptCount: -1}, true), {code: "failed-precondition"});
});

test("concurrent tenth-attempt resets commit once; replay/resume do not consume another attempt", async (t) => {
  const env = {FUNCTIONS_EMULATOR: "true", GCLOUD_PROJECT: "demo-unit", LEGAL_DOCUMENT_VERSION: "test",
    LEGAL_TERMS_URL: "https://example.test/terms", LEGAL_PRIVACY_URL: "https://example.test/privacy",
    ELIGIBILITY_POLICY_JSON: JSON.stringify({version: "test", minimumAge: 18, ageBasis: "declared_birth_date", timeZone: "America/Lima", status: "synthetic", approvalReference: "fixture"})};
  const original = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const db = memoryFirestore();
  db.seed("users/person", {roles: ["patient"], fechaNacimiento: "1990-01-01", patientOnboardingStatus: "complete",
    legalAcceptance: {version: "test", termsUrl: env.LEGAL_TERMS_URL, privacyUrl: env.LEGAL_PRIVACY_URL, acceptedAt: "synthetic"}});
  db.seed("conversations/person", {activeSessionId: "ninth", surveyAttemptCount: 9});
  t.mock.method(firestore, "getFirestore", () => db);
  const auth = {uid: "person", token: {email_verified: true}};
  const attempts = await Promise.allSettled(["reset-attempt-one", "reset-attempt-two"].map((requestId) => resetProfileChatConversation({auth, data: {requestId}})));
  assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = attempts.find((r) => r.status === "rejected");
  assert.equal(rejected.reason.details.reason, "survey_attempts_exhausted");
  const index = attempts.findIndex((r) => r.status === "fulfilled");
  const requestId = ["reset-attempt-one", "reset-attempt-two"][index];
  assert.deepEqual(await resetProfileChatConversation({auth, data: {requestId}}), attempts[index].value);
  const resumed = await startProfileChatConversation({auth});
  assert.equal(resumed.sessionId, attempts[index].value.activeSessionId);
  assert.equal(db.records.get("conversations/person").surveyAttemptCount, 10);
});

test("monthly USD cap renews at Lima month boundaries while account and session allocations remain fixed", () => {
  const env = {AI_ADMISSION_LIMITS_JSON: JSON.stringify({version: "approved-2026-10-31", periodMode: "calendar_month_lima",
    accountInferenceLimit: 200, sessionInferenceLimit: 20, budgetNanoUsd: 50000000000, pricingVersion: "openai-standard-2026-10-31"})};
  const october = admissionPolicy(env, new Date("2026-11-01T04:59:59Z"));
  const november = admissionPolicy(env, new Date("2026-11-01T05:00:00Z"));
  assert.equal(october.periodId, "admission-2026-10");
  assert.equal(november.periodId, "admission-2026-11");
  assert.equal(october.endsAt, november.startsAt);
  assert.equal(november.endsAt, "2026-12-01T05:00:00.000Z");
  assert.equal(november.budgetNanoUsd, 50000000000);
  assert.equal(november.accountInferenceLimit, 200);
  assert.equal(november.sessionInferenceLimit, 20);
});
