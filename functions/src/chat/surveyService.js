/* eslint-disable max-len */
const {createHash, randomUUID} = require("node:crypto");
const {FieldValue} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {PROFILE_DEFAULTS, finalizeProfileForMatching, sanitizeModelProfileData} = require("../profiles/profile");
const {makeTurn, validateTurn, localAnswer} = require("./surveyTurn");
const {getCrisisResult} = require("../safety/suicideRisk");
const {getActiveChatSession} = require("./session");
const {getRecentHistory} = require("./history");
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function chatLimits(env = process.env) {
  try {
    const p = JSON.parse(env.CHAT_LIMITS_JSON || "null");
    if (!p || !/^[\w.-]{1,80}$/.test(p.version) ||
        ![p.requestsPerDay, p.globalConcurrency].every((n) => Number.isInteger(n) && n > 0 && n <= 10000)) return null;
    return p;
  } catch (_) {
    return null;
  }
}
function createSurveyService({db, generate, now = Date.now, limits = chatLimits}) {
  async function send(uid, data) {
    const message = typeof data.message === "string" ? data.message.trim() : "";
    if (!message || message.length > 1200 || !/^[A-Za-z0-9_-]{8,100}$/.test(data.requestId || "")) throw new HttpsError("invalid-argument", "Revisa el mensaje y su identificador.");
    const config = limits();
    if (!config) throw new HttpsError("failed-precondition", "Los límites de uso todavía no están configurados. La ayuda sigue disponible.");
    const conversationRef = db.doc(`conversations/${uid}`); const profileRef = db.doc(`profiles/${uid}`);
    const operationRef = db.doc(`profile_chat_operations/${uid}_${data.requestId}`);
    const quotaRef = db.doc(`profile_chat_quotas/${uid}`); const globalRef = db.doc("runtime_controls/chat_concurrency");
    const fingerprint = hash({message, sessionId: data.sessionId || "", turnId: data.turnId || "", option: data.option || null});
    const lease = randomUUID(); const globalKey = hash(uid);
    const claim = await db.runTransaction(async (tx) => {
      const [conversationSnap, profileSnap, operationSnap, quotaSnap, globalSnap] = await Promise.all(
          [conversationRef, profileRef, operationRef, quotaRef, globalRef].map((ref) => tx.get(ref)));
      const previous = operationSnap.data();
      const conversation = conversationSnap.data() || {};
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new HttpsError("already-exists", "Ese identificador ya se usó para otro envío.");
        if (previous.sessionId !== conversation.activeSessionId) throw new HttpsError("aborted", "Ese envío pertenece a una sesión anterior.");
        if (previous.status === "completed") return {cached: previous.result};
        if (previous.status === "failed" || previous.leaseUntil <= now()) throw new HttpsError("failed-precondition", "El envío quedó sin resultado confirmado. No se repetirá automáticamente; revisa la conversación antes de crear un envío nuevo.");
        throw new HttpsError("aborted", "El envío sigue en curso. Espera y reintenta la misma operación.");
      }
      validateTurn(data, conversation);
      const quota = quotaSnap.data() || {}; const global = globalSnap.data() || {};
      const day = new Date(now()).toISOString().slice(0, 10);
      const count = quota.day === day ? quota.count : 0;
      const leases = Object.fromEntries(Object.entries(global.leases || {}).filter(([, item]) => item.until > now()));
      if (quota.leaseUntil > now()) throw new HttpsError("aborted", "Ya tienes un envío en curso.");
      if (count >= config.requestsPerDay || Object.keys(leases).length >= config.globalConcurrency) throw new HttpsError("resource-exhausted", "Se alcanzó el límite de uso. La ayuda sigue disponible.");
      const session = getActiveChatSession(conversation);
      const sessionId = session.id;
      const profile = {...PROFILE_DEFAULTS, ...sanitizeModelProfileData(profileSnap.data() || {}), sessionId};
      const activeTurn = conversation.activeTurn || makeTurn(profile, sessionId);
      const until = now() + 90000;
      tx.set(operationRef, {uid, requestId: data.requestId, fingerprint, sessionId, status: "processing", lease, leaseUntil: until, createdAt: FieldValue.serverTimestamp()});
      tx.set(quotaRef, {day, count: count + 1, lease, leaseUntil: until, policyVersion: config.version});
      tx.set(globalRef, {leases: {...leases, [globalKey]: {lease, until}}});
      tx.set(conversationRef, {uid, activeSessionId: sessionId, activeTurn, sessionStartedAt: session.startedAt,
        updatedAt: FieldValue.serverTimestamp()}, {merge: true});
      return {profile, sessionId, activeTurn};
    });
    if (claim.cached) return claim.cached;
    try {
      const crisis = getCrisisResult(message);
      const local = localAnswer(message, claim.activeTurn);
      const answer = crisis || local || await generate({currentProfile: claim.profile,
        history: await getRecentHistory(conversationRef.collection("messages"), claim.sessionId), latestUserMessage: message});
      const clean = sanitizeModelProfileData(answer.data || {});
      // Risk cannot be cleared by a preference correction/model response.
      const profile = finalizeProfileForMatching({...claim.profile, ...clean,
        riesgoSuicida: Boolean(claim.profile.riesgoSuicida || clean.riesgoSuicida)});
      const activeTurn = makeTurn(profile, claim.sessionId, answer.confirmSoloConversar === true);
      const reply = profile.riesgoSuicida ? (crisis?.reply || "Puedes consultar los recursos de ayuda. Este servicio no vigila ni garantiza respuesta inmediata.") :
        `${answer.uncertain ? "Puedes dejar esta preferencia pendiente; elige una opción cuando lo tengas claro. " : ""}${activeTurn.question || "Puedes consultar los profesionales recomendados."}`;
      const result = {reply, data: clean, suggestedOptions: activeTurn.options, profile, activeTurn,
        readyForRecommendations: profile.completado, sessionId: claim.sessionId};
      await db.runTransaction(async (tx) => {
        const [conversation, operation, quota, global] = await Promise.all([conversationRef, operationRef, quotaRef, globalRef].map((ref) => tx.get(ref)));
        if (conversation.data()?.activeSessionId !== claim.sessionId || conversation.data()?.activeTurn?.id !== claim.activeTurn.id ||
            operation.data()?.lease !== lease || operation.data()?.leaseUntil <= now()) throw new HttpsError("aborted", "La respuesta llegó después de que cambió la conversación.");
        const stamp = FieldValue.serverTimestamp();
        tx.set(profileRef, {...profile, uid, updatedAt: stamp});
        tx.set(conversationRef, {activeTurn, lastMessage: reply, updatedAt: stamp}, {merge: true});
        for (const [role, text] of [["user", message], ["assistant", reply]]) {
          tx.set(conversationRef.collection("messages").doc(`${role}_${data.requestId}`), {
            role, text, sessionId: claim.sessionId, requestId: data.requestId, createdAt: stamp,
            ...(role === "assistant" ? {suggestedOptions: activeTurn.options, turnId: activeTurn.id} : {}),
          });
        }
        if (!claim.profile.completado && profile.completado) {
          tx.set(db.doc(`longitudinal_history/survey_${uid}_${data.requestId}`), {pacienteUid: uid,
            eventType: "initial_profile_completed", sourceType: "profile", sourceId: uid,
            title: "Preferencias iniciales registradas", summary: "Se registraron las preferencias para continuar.",
            visibility: "patient", createdBy: "system", occurredAt: new Date(now()).toISOString(), createdAt: stamp});
        }
        tx.update(operationRef, {status: "completed", result, leaseUntil: 0, updatedAt: stamp});
        release(tx, quotaRef, globalRef, quota.data(), global.data(), lease, globalKey);
      });
      return result;
    } catch (error) {
      await db.runTransaction(async (tx) => {
        const [op, quota, global] = await Promise.all([operationRef, quotaRef, globalRef].map((ref) => tx.get(ref)));
        if (op.data()?.lease === lease && op.data()?.status !== "completed") tx.update(operationRef, {status: "failed", leaseUntil: 0, errorCode: "unconfirmed", updatedAt: FieldValue.serverTimestamp()});
        release(tx, quotaRef, globalRef, quota.data(), global.data(), lease, globalKey);
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("unavailable", "No se confirmó una respuesta. La ayuda sigue disponible; revisa la conversación antes de enviar nuevamente.");
    }
  }
  return {send};
}
function release(tx, quotaRef, globalRef, quota = {}, global = {}, lease, key) {
  if (quota.lease === lease) tx.update(quotaRef, {leaseUntil: 0});
  if (global.leases?.[key]?.lease === lease) {
    const leases = {...global.leases}; delete leases[key]; tx.set(globalRef, {leases});
  }
}
module.exports = {createSurveyService, chatLimits};
