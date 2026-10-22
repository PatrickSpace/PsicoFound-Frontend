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
  assert.equal((await db.doc(`profiles/${uid}`).get()).data().modalidad, "remoto");
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
  const messages = await db.collection(`conversations/${uid}/messages`).get();
  assert.equal(messages.size, 1);
  assert.equal(messages.docs[0].data().role, "assistant");
  assert.equal(messages.docs[0].data().sessionId, reset.activeSessionId);
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
  const recoveryService = createSurveyService({db, limits, now: () => clock,
    generate: async () => ({reply: "Gracias por compartirlo.", data: {}, riskSignal: "none"})});
  await recoveryService.send(uid, {message: "hola", requestId: "recover-lease-one"});
  await recoveryService.send(uid, {message: "hola", requestId: "third-operation"});
  await assert.rejects(recoveryService.send(uid, {message: "hola", requestId: "fourth-operation"}), {code: "resource-exhausted"});
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
test("B-02: HTTP turns survive reload, reject stale options and keep AI fallback pending", async () => {
  await httpCall("B", "resetProfileChatConversation", {requestId: "http-local-reset"});
  const first = await httpCall("B", "sendProfileChatMessage", {message: "hola", requestId: "http-local-first"});
  const next = await httpCall("B", "sendProfileChatMessage", {message: "Solo quiero conversar", requestId: "http-local-second",
    turnId: first.activeTurn.id, sessionId: first.sessionId, option: first.activeTurn.options.find(o => o.label === "Solo conversar")});
  assert.equal(next.activeTurn.field, "modalidad");
  await assert.rejects(httpCall("B", "sendProfileChatMessage", {message: "Ansiedad", requestId: "http-stale-option",
    turnId: first.activeTurn.id, option: first.activeTurn.options[0]}), {code: "aborted"});
  await assert.rejects(httpCall("B", "sendProfileChatMessage", {message: "No sé", requestId: "http-local-third",
    turnId: next.activeTurn.id, sessionId: next.sessionId}), {code: "unavailable"});
  const conversation = (await db.doc(`conversations/${uid}`).get()).data();
  assert.equal(conversation.activeTurn.field, "modalidad");
  assert.match(conversation.lastMessage, /IA no está disponible/);
  assert.match(conversation.lastMessage, new RegExp(next.activeTurn.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal((await db.doc(`profiles/${uid}`).get()).data().modalidad, "");
  const fallback = await db.collection(`conversations/${uid}/messages`)
      .where("requestId", "==", "http-local-third").get();
  assert.equal(fallback.size, 2);
});

test("B-04: guided answers complete without AI and require summary confirmation", async () => {
  await db.doc(`profiles/${uid}`).delete();
  await db.doc(`conversations/${uid}`).delete();
  const first = await httpCall("B", "startProfileChatConversation", {});
  const again = await httpCall("B", "startProfileChatConversation", {});
  assert.equal(first.sessionId, again.sessionId);
  assert.equal(first.activeTurn.id, again.activeTurn.id);
  let providerCalls = 0;
  const service = createSurveyService({db,
    limits: () => ({version: "guided-test", requestsPerDay: 10, globalConcurrency: 1}),
    inputMode: () => "guided",
    generate: async () => { providerCalls++; throw new Error("must not call AI"); }});
  await assert.rejects(service.send(uid, {message: "Unknown free text", requestId: "guided-unknown"}), {code: "invalid-argument"});
  assert.equal((await db.doc(`profile_chat_quotas/${uid}`).get()).exists, false);
  const topic = await service.send(uid, {message: "Ansiedad", requestId: "guided-topic", sessionId: first.sessionId,
    turnId: first.activeTurn.id, option: first.activeTurn.options.find(o => o.label === "Ansiedad")});
  const modality = await service.send(uid, {message: "Online", requestId: "guided-modality", sessionId: topic.sessionId,
    turnId: topic.activeTurn.id, option: topic.activeTurn.options.find(o => o.label === "Online")});
  const gender = await service.send(uid, {message: "Me da igual", requestId: "guided-gender", sessionId: topic.sessionId,
    turnId: modality.activeTurn.id, option: modality.activeTurn.options.find(o => o.label === "Me da igual")});
  const age = await service.send(uid, {message: "Me da igual", requestId: "guided-age", sessionId: topic.sessionId,
    turnId: gender.activeTurn.id, option: gender.activeTurn.options.find(o => o.label === "Me da igual")});
  const ready = await service.send(uid, {message: "Me da igual", requestId: "guided-approach", sessionId: topic.sessionId,
    turnId: age.activeTurn.id, option: age.activeTurn.options.find(o => o.label === "Me da igual")});
  assert.equal(ready.readyForRecommendations, false);
  assert.equal(ready.summaryRequired, true);
  assert.equal(ready.activeTurn.status, "complete");
  for (const field of ["preferenciaEdad", "preferenciaGenero", "enfoque"]) assert.equal(ready.profile[field], "indiferente");
  const confirmed = await httpCall("B", "confirmProfileSummary", {sessionId: first.sessionId});
  assert.equal(confirmed.readyForRecommendations, true);
  const reopened = await httpCall("B", "startProfileChatConversation", {});
  assert.equal(reopened.sessionId, first.sessionId);
  assert.equal(reopened.profile.completado, true);
  assert.equal(reopened.profile.summaryConfirmed, true);
  assert.equal((await db.collection(`conversations/${uid}/messages`).get()).size, 11);
  assert.equal(providerCalls, 0);
});

test("B-04: preferences rank closest available profiles without mandatory filters", async () => {
  const date = new Date(Date.now() + 86400000).toISOString().slice(0,10);
  await db.doc(`profiles/${uid}`).set({temas: ["Ansiedad"], modalidad: "Online",
    preferenciaGenero: "Indiferente", preferenciaEdad: "Indiferente",
    enfoque: "Indiferente", summaryConfirmed: true, completado: false});
  const therapists = await db.collection("therapists").get();
  const slots = await db.collection("therapist_availability").get();
  const batch = db.batch();
  for(const doc of [...therapists.docs,...slots.docs]) batch.delete(doc.ref);
  for(let i=0;i<7;i++) {
    const id=`survey-professional-${i}`;
    batch.set(db.doc(`therapists/${id}`),{nombre:`Professional ${i}`,activo:true,especialidades:["Ansiedad"],modalidades:[i===6?"Presencial":"Online"]});
    if(i>=5) batch.set(db.doc(`therapist_availability/survey-slot-${i}`),{therapistId:id,date,startTime:"10:00",endTime:"11:00",durationMinutes:60,timeZone:"America/Lima",status:"available",modality:i===6?"Presencial":"Remoto"});
  }
  await batch.commit();
  const result=await httpCall("B","getRecommendedTherapists",{requiredCriteria:[]});
  assert.equal(result.outcome,"ok");
  assert.deepEqual(result.requiredCriteria,[]);
  assert.deepEqual(result.therapists.map(t=>t.id),["survey-professional-5","survey-professional-6"]);
  assert.equal(result.profile.completado,true);
  await db.doc(`profiles/${uid}`).update({modalidad:"Híbrido"});
  const hybrid=await httpCall("B","getRecommendedTherapists",{requiredCriteria:[]});
  assert.deepEqual(hybrid.therapists.map(t=>t.id),["survey-professional-5","survey-professional-6"]);
  await db.doc(`profiles/${uid}`).update({modalidad:""});
  await assert.rejects(httpCall("B","getRecommendedTherapists",{}),{code:"failed-precondition"});
});
