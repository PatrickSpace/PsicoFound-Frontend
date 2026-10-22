/* eslint-disable max-len */
const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {join} = require("node:path");
const {test} = require("node:test");
const firestoreAdmin = require("firebase-admin/firestore");
const {resetProfileChatConversation} = require("./profileChatHandlers");

process.env.FUNCTIONS_EMULATOR = "true";
process.env.GCLOUD_PROJECT = "demo-unit";
process.env.ELIGIBILITY_POLICY_JSON = JSON.stringify({version: "unit-v1", minimumAge: 18,
  ageBasis: "declared_birth_date", timeZone: "America/Lima", status: "synthetic", approvalReference: "fixture"});
process.env.LEGAL_DOCUMENT_VERSION = "unit-v1";
process.env.LEGAL_TERMS_URL = "https://example.test/terms";
process.env.LEGAL_PRIVACY_URL = "https://example.test/privacy";
const accountRef = () => ({get: async () => ({data: () => ({
  roles: ["patient"], fechaNacimiento: "1990-01-01", patientOnboardingStatus: "complete",
  legalAcceptance: {version: "unit-v1", termsUrl: process.env.LEGAL_TERMS_URL,
    privacyUrl: process.env.LEGAL_PRIVACY_URL, acceptedAt: "synthetic"},
})})});
const patientAuth = {uid: "patient", token: {email_verified: true}};

test("profileChatHandlers consume AIService y no un proveedor concreto", () => {
  const source = readFileSync(
      join(__dirname, "profileChatHandlers.js"),
      "utf8",
  );

  assert.match(source, /require\("\.\.\/ai\/AIService"\)/);
  assert.doesNotMatch(source, /geminiClient/);
  assert.doesNotMatch(source, /GoogleGenAI/);
  assert.doesNotMatch(source, /generateContent/);
  assert.doesNotMatch(source, /askGemini/);
});

test("reset writes conversation, profile and operation atomically", async (t) => {
  const writes = [];
  const fakeRef = (path) => ({path, get: accountRef().get,
    collection: (name) => ({doc: (id) => fakeRef(`${path}/${name}/${id}`)})});
  const fakeDb = {
    doc: fakeRef,
    runTransaction: async (run) => run({
      get: async () => ({data: () => undefined}),
      set: (ref, data) => writes.push({path: ref.path, data}),
      create: (ref, data) => writes.push({path: ref.path, data}),
    }),
  };
  t.mock.method(firestoreAdmin, "getFirestore", () => fakeDb);
  const result = await resetProfileChatConversation({auth: patientAuth});
  assert.equal(writes.length, 5);
  assert.ok(writes.some((item) => item.path === "survey_summaries/patient"));
  assert.ok(writes.some((item) =>
    item.path.startsWith("conversations/patient/messages/assistant_start_")));
  const conversation = writes.find((item) => item.path === "conversations/patient").data;
  const profile = writes.find((item) => item.path === "profiles/patient").data;
  assert.equal(profile.sessionId, result.activeSessionId);
  assert.equal(conversation.activeSessionId, result.activeSessionId);
  assert.equal(profile.completado, false);
  assert.equal(profile.riesgoSuicida, false);
  assert.deepEqual(profile.temas, []);
});

test("reset propagates transaction failures", async (t) => {
  const error = new Error("commit rejected");
  t.mock.method(firestoreAdmin, "getFirestore", () => ({
    doc: accountRef, runTransaction: async () => {
      throw error;
    },
  }));
  await assert.rejects(resetProfileChatConversation({auth: patientAuth}), (value) => value === error);
});

test("anonymous callers cannot reset a profile", async () => {
  await assert.rejects(resetProfileChatConversation({}),
      (error) => error.code === "unauthenticated");
});
