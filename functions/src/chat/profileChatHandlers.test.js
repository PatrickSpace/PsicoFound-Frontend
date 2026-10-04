const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {join} = require("node:path");
const {test} = require("node:test");
const admin = require("firebase-admin");
const {resetProfileChatConversation} = require("./profileChatHandlers");

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

test("reset writes conversation and empty profile in one batch", async (t) => {
  const writes = [];
  let commits = 0;
  const fakeDb = {
    collection: (name) => ({doc: (uid) => ({path: `${name}/${uid}`})}),
    batch: () => ({
      set: (ref, data) => writes.push({path: ref.path, data}),
      commit: async () => commits++,
    }),
  };
  const firestore = Object.assign(() => fakeDb, {
    FieldValue: admin.firestore.FieldValue,
    Timestamp: admin.firestore.Timestamp,
  });
  t.mock.getter(admin, "firestore", () => firestore);
  const result = await resetProfileChatConversation({auth: {uid: "patient"}});
  assert.equal(commits, 1);
  assert.equal(writes.length, 2);
  const conversation = writes.find((item) =>
    item.path === "conversations/patient").data;
  const profile = writes.find((item) => item.path === "profiles/patient").data;
  assert.equal(profile.sessionId, result.activeSessionId);
  assert.equal(conversation.activeSessionId, result.activeSessionId);
  assert.equal(conversation.lastMessage, "");
  assert.equal(profile.completado, false);
  assert.equal(profile.riesgoSuicida, false);
  assert.equal(profile.soloConversar, false);
  assert.deepEqual(profile.temas, []);
});

test("reset propagates batch failures", async (t) => {
  const error = new Error("commit rejected");
  const firestore = Object.assign(() => ({
    collection: () => ({doc: () => ({})}),
    batch: () => ({set: () => {}, commit: async () => {
      throw error;
    }}),
  }), {
    FieldValue: admin.firestore.FieldValue,
    Timestamp: admin.firestore.Timestamp,
  });
  t.mock.getter(admin, "firestore", () => firestore);
  await assert.rejects(
      resetProfileChatConversation({auth: {uid: "patient"}}),
      (value) => value === error,
  );
});

test("anonymous callers cannot reset a profile", async () => {
  await assert.rejects(resetProfileChatConversation({}),
      (error) => error.code === "unauthenticated");
});
