import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { seedPatient, httpCall } from "./helpers/patient-http.mjs";
import { adminApps, adminFirestore } from "./helpers/admin-sdk.mjs";
const require = createRequire(import.meta.url);
const { createSurveyService } = require("../functions/src/chat/surveyService.js");
let app, db;
beforeEach(async () => { app = await seedPatient(); db = adminFirestore.getFirestore(app); });
after(async () => { await adminApps.deleteApp(app); });
const uid = "patient-b";
const limits = () => ({version: "synthetic", requestsPerDay: 3, globalConcurrency: 1});
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; }

test("B-02/C-01/02: concurrent retries invoke one provider and commit profile, turn and message pair once", async () => {
  const started = deferred(), answer = deferred(); let calls = 0;
  const service = createSurveyService({db, limits, generate: async () => { calls++; started.resolve(); return answer.promise; }});
  const data = {message: "Necesito hablar de trabajo", requestId: "idempotency-one"};
  const pending = service.send(uid, data); await started.promise;
  await assert.rejects(service.send(uid, data), {code: "aborted"});
  await assert.rejects(service.send(uid, {...data, requestId: "different-operation"}), {code: "aborted"});
  await assert.rejects(service.send("patient-c", {...data, requestId: "global-limit"}), {code: "resource-exhausted"});
  answer.resolve({data: {temas: ["Problemas laborales"], modalidad: "online"}});
  const result = await pending;
  assert.deepEqual(await service.send(uid, data), result); assert.equal(calls, 1);
  assert.equal((await db.collection(`conversations/${uid}/messages`).get()).size, 2);
  assert.equal((await db.doc(`profiles/${uid}`).get()).data().modalidad, "online");
  await assert.rejects(service.send(uid, {...data, message: "Changed"}), {code: "already-exists"});
  assert.deepEqual((await db.doc("runtime_controls/chat_concurrency").get()).data().leases, {});
});
test("B-02/C-02: reset while provider runs discards late response and old operation replay", async () => {
  const started = deferred(), answer = deferred();
  const service = createSurveyService({db, limits, generate: async () => { started.resolve(); return answer.promise; }});
  const data = {message: "Una respuesta demorada", requestId: "late-response-one"};
  const pending = service.send(uid, data); await started.promise;
  const reset = await httpCall("B", "resetProfileChatConversation", {requestId: "reset-while-pending"});
  assert.deepEqual(await httpCall("B", "resetProfileChatConversation", {requestId: "reset-while-pending"}), reset);
  answer.resolve({data: {motivoConsulta: "STALE", temas: ["Ansiedad"]}});
  await assert.rejects(pending, {code: "aborted"});
  await assert.rejects(service.send(uid, data), {code: "aborted"});
  const profile = (await db.doc(`profiles/${uid}`).get()).data();
  assert.equal(profile.sessionId, reset.activeSessionId); assert.equal(profile.motivoConsulta, "");
  assert.equal((await db.collection(`conversations/${uid}/messages`).get()).size, 0);
});
test("C-01/02: failed provider not repeated, expired lease recoverable, daily quota remains distributed", async () => {
  let calls = 0, clock = Date.now();
  const service = createSurveyService({db, limits, now: () => clock, generate: async () => { calls++; throw new Error("sensitive-provider-payload"); }});
  const data = {message: "Texto sintético para fallo", requestId: "failed-provider-one"};
  await assert.rejects(service.send(uid, data), {code: "unavailable"});
  await assert.rejects(service.send(uid, data), {code: "failed-precondition"}); assert.equal(calls, 1);
  await db.doc(`profile_chat_quotas/${uid}`).update({leaseUntil: clock + 1000});
  await assert.rejects(service.send(uid, {message: "hola", requestId: "recover-lease-one"}), {code: "aborted"});
  clock += 2000;
  await service.send(uid, {message: "hola", requestId: "recover-lease-one"});
  await service.send(uid, {message: "hola", requestId: "third-operation"});
  await assert.rejects(service.send(uid, {message: "hola", requestId: "fourth-operation"}), {code: "resource-exhausted"});
  assert.equal(calls, 1);
  assert.equal(JSON.stringify((await db.doc(`profile_chat_operations/${uid}_failed-provider-one`).get()).data()).includes("sensitive-provider-payload"), false);
});
test("B-02: correction preserves fields and invalidates an in-flight result; no partial messages after failure", async () => {
  const started = deferred(), answer = deferred();
  const service = createSurveyService({db, limits, generate: async () => { started.resolve(); return answer.promise; }});
  const pending = service.send(uid, {message: "Extraer varios campos", requestId: "correction-race"}); await started.promise;
  await httpCall("B", "updateProfilePreferences", {profile: {modalidad: "presencial"}});
  answer.resolve({data: {modalidad: "online"}});
  await assert.rejects(pending, {code: "aborted"});
  assert.equal((await db.doc(`profiles/${uid}`).get()).data().modalidad, "presencial");
  assert.equal((await db.doc(`profiles/${uid}`).get()).data().motivoConsulta, "Motivo sintético");
  assert.equal((await db.collection(`conversations/${uid}/messages`).get()).size, 0);
});
test("B-02: HTTP local turns survive reload, reject stale options and keep uncertainty pending", async () => {
  await httpCall("B", "resetProfileChatConversation", {requestId: "http-local-reset"});
  const first = await httpCall("B", "sendProfileChatMessage", {message: "hola", requestId: "http-local-first"});
  const next = await httpCall("B", "sendProfileChatMessage", {message: "Solo quiero conversar", requestId: "http-local-second",
    turnId: first.activeTurn.id, sessionId: first.sessionId, option: first.activeTurn.options.find(o => o.label === "Solo conversar")});
  assert.equal(next.activeTurn.field, "modalidad");
  await assert.rejects(httpCall("B", "sendProfileChatMessage", {message: "Ansiedad", requestId: "http-stale-option",
    turnId: first.activeTurn.id, option: first.activeTurn.options[0]}), {code: "aborted"});
  const third = await httpCall("B", "sendProfileChatMessage", {message: "No sé", requestId: "http-local-third", turnId: next.activeTurn.id, sessionId: next.sessionId});
  assert.equal(third.activeTurn.field, "modalidad"); assert.equal(third.profile.modalidad, "");
  assert.equal((await db.doc(`conversations/${uid}`).get()).data().activeTurn.id, third.activeTurn.id);
});
