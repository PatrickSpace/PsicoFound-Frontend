/* eslint-disable max-len */
const test = require("node:test");
const assert = require("node:assert/strict");
const {makeTurn, validateTurn, localAnswer} = require("./surveyTurn");
const {buildProfileChatMessages} = require("../ai/profilePrompt");
const {assertProviderApproved} = require("../ai/providerPolicy");
const {getActiveChatSession} = require("./session");
const {buildReply, findConflicts} = require("./surveyService");

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
  const policy = {status: "approved", provider: "openai", model: "gpt-6-luna", plan: "paid", scope: "hybrid_survey_matching", version: "v1",
    approvalReference: "ref", billingEvidenceReference: "ref", clinicalReviewReference: "ref", privacyReviewReference: "ref"};
  assert.throws(() => assertProviderApproved({FUNCTIONS_EMULATOR: "true", AI_USE_APPROVAL_JSON: JSON.stringify(policy)}));
  assert.equal(assertProviderApproved({AI_USE_APPROVAL_JSON: JSON.stringify(policy)}).version, "v1");
});
test("a contradictory value becomes an explicit confirmation turn", () => {
  const turn = makeTurn({}, "s", {field: "modalidad", previous: "online",
    next: "presencial", data: {modalidad: "presencial"},
    pendingConflicts: [{field: "enfoque", previous: "Humanista",
      next: "Integrativo", data: {enfoque: "Integrativo"}}]});
  assert.equal(turn.kind, "overwrite_confirmation");
  assert.deepEqual(localAnswer("sí", turn).data, {modalidad: "presencial"});
  assert.deepEqual(localAnswer("no", turn).data, {});
  assert.equal(localAnswer("no", turn).nextConfirmation.field, "enfoque");
});
test("every contradictory field is isolated until the user confirms it", () => {
  const conflicts = findConflicts(
      {modalidad: "online", enfoque: "Humanista"},
      {modalidad: "presencial", enfoque: "Integrativo",
        preferenciaEdad: "indiferente"},
  );
  assert.deepEqual(conflicts, [
    {field: "modalidad", previous: "online", next: "presencial"},
    {field: "enfoque", previous: "Humanista", next: "Integrativo"},
  ]);
});
test("the fifth no-progress turn redirects gently to the pending answer", () => {
  const reply = buildReply(
      {reply: "Entiendo que esto puede ser difícil."},
      {status: "active", question: "¿Prefieres atención online o presencial?"},
      {redirected: true, conflict: null, changed: false},
  );
  assert.match(reply, /Gracias por confiarme esto/);
  assert.match(reply, /¿Prefieres atención online o presencial\?/);
});
