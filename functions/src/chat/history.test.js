/* eslint-disable max-len */
const assert = require("node:assert/strict");
const {test} = require("node:test");
const {getRecentHistory} = require("./history");
const {memoryFirestore} = require("./testing/memoryFirestore");
const {buildProfileChatMessages} = require("../ai/profilePrompt");

test("reads eight documents and sends the last four whole exchanges in order", async () => {
  const db = memoryFirestore();
  for (let index = 0; index < 30; index++) {
    for (const role of ["user", "assistant"]) db.seed(`messages/${role}_${index}`, {sessionId: "active", requestId: `r-${index}`, role, text: `${role} ${index}`, createdAt: new Date(index + 1)});
  }
  const history = await getRecentHistory(db.collection("messages"), "active");
  assert.equal(db.metrics.historyDocuments, 8);
  assert.equal(history.length, 4);
  assert.deepEqual(history[0], {user: "user 26", assistant: "assistant 26"});
  const messages = buildProfileChatMessages({history, latestUserMessage: "actual"});
  assert.deepEqual(messages.slice(1, -1).map((m) => m.role), Array(4).fill(["user", "assistant"]).flat());
  assert.equal(messages[8].content, "assistant 29");
});

test("drops partial, other-session, start and safety exchanges without expanding reads", async () => {
  const docs = [
    {sessionId: "other", requestId: "x", role: "user", text: "FOREIGN"},
    {sessionId: "active", requestId: "start", role: "assistant", text: "START"},
    {sessionId: "active", requestId: "partial", role: "user", text: "PARTIAL"},
    ...["user", "assistant"].map((role) => ({sessionId: "active", requestId: "help", modelContext: false, role, text: "RISK"})),
    ...["user", "assistant"].map((role) => ({sessionId: "active", requestId: "pair", role, text: role})),
  ].map((value) => ({data: () => value}));
  const ref = {orderBy() {
    return this;
  }, where() {
    return this;
  }, limit(n) {
    assert.equal(n, 8); return this;
  }, async get() {
    return {docs};
  }};
  assert.deepEqual(await getRecentHistory(ref, "active"), [{user: "user", assistant: "assistant"}]);
});

test("a character guard selects whole recent pairs, preserving current preferences and pending question", () => {
  const history = [
    {user: "OLD".repeat(4100), assistant: "ANSWER-OLD"},
    {user: "recent user", assistant: "recent assistant"},
  ];
  const messages = buildProfileChatMessages({history, currentProfile: {modalidad: "presencial", preferenciaEdad: "+45"}, activeTurn: {question: "¿Quieres cambiarlo?"}, latestUserMessage: "sí"});
  assert.equal(messages.length, 4);
  assert.equal(messages[1].content, "recent user");
  assert.ok(messages[0].content.includes("\"preferenciaEdad\":\"+45\""));
  assert.ok(messages[0].content.includes("¿Quieres cambiarlo?"));
});

test("contact redaction precedes shortening and applies to both sides of history", () => {
  const messages = buildProfileChatMessages({history: [{user: "test@example.test", assistant: "Llama 999888777"}], latestUserMessage: "x".repeat(1199) + " secret@example.test"});
  assert.doesNotMatch(JSON.stringify(messages), /test@example|secret@|999888777/);
});
