/* eslint-disable max-len */
const test = require("node:test");
const assert = require("node:assert/strict");
const {makeTurn, validateTurn, localAnswer} = require("./surveyTurn");
const {buildProfileChatMessages} = require("../ai/profilePrompt");
const {assertProviderApproved} = require("../ai/providerPolicy");
const {getActiveChatSession} = require("./session");

test("turn options and question agree; stale chips are rejected", () => {
  const turn = makeTurn({temas: ["Ansiedad"]}, "s");
  assert.equal(turn.field, "modalidad");
  assert.ok(turn.options.every((option) => option.field === turn.field));
  assert.deepEqual(localAnswer("no sé", turn).data, {});
  assert.deepEqual(localAnswer("me da igual", turn).data, {modalidad: "indiferente"});
  const conversation = {activeSessionId: "s", activeTurn: turn};
  assert.throws(() => validateTurn({turnId: "old"}, conversation), {code: "aborted"});
  assert.throws(() => validateTurn({option: turn.options[0]}, conversation), {code: "failed-precondition"});
  validateTurn({turnId: turn.id, option: turn.options[0]}, conversation);
});
test("yes/no is contextual and a session persists past five minutes", () => {
  assert.equal(localAnswer("sí", makeTurn({}, "s")), null);
  const turn = makeTurn({}, "s", true);
  assert.equal(localAnswer("sí", turn).data.soloConversar, true);
  assert.equal(localAnswer("no", turn).data.soloConversar, false);
  assert.equal(getActiveChatSession({activeSessionId: "saved", sessionStartedAt: new Date("2020-01-01")}).id, "saved");
});
test("provider payload omits administrative attributes and masks contact details", () => {
  const result = JSON.stringify(buildProfileChatMessages({currentProfile: {uid: "UID-SECRET", nombre: "NAME-SECRET", email: "secret@example.test", token: "TOKEN-SECRET", motivoConsulta: "Ansiedad"},
    latestUserMessage: "correo test@example.test teléfono 999888777", history: "test@example.test"}));
  for (const secret of ["UID-SECRET", "NAME-SECRET", "TOKEN-SECRET", "test@example.test", "999888777"]) assert.equal(result.includes(secret), false);
  assert.ok(result.includes("Ansiedad"));
});
test("real provider cannot run in emulators or without explicit approved evidence", () => {
  assert.throws(() => assertProviderApproved({}), {code: "failed-precondition"});
  const policy = {status: "approved", provider: "gemini", plan: "paid", scope: "administrative_matching", version: "v1",
    approvalReference: "ref", billingEvidenceReference: "ref", clinicalReviewReference: "ref", privacyReviewReference: "ref"};
  assert.throws(() => assertProviderApproved({FUNCTIONS_EMULATOR: "true", AI_USE_APPROVAL_JSON: JSON.stringify(policy)}));
  assert.equal(assertProviderApproved({AI_USE_APPROVAL_JSON: JSON.stringify(policy)}).version, "v1");
});
