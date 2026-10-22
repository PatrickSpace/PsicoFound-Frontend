/* eslint-disable max-len */
const {createHash, randomUUID} = require("node:crypto");
const {FieldValue} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {PROFILE_DEFAULTS, finalizeProfileForMatching, sanitizeModelProfileData} = require("../profiles/profile");
const {makeTurn, validateTurn, localAnswer} = require("./surveyTurn");
const {surveyInputMode} = require("./surveyPolicy");
const {CRISIS_REPLY, getCrisisResult} = require("../safety/suicideRisk");
const {getActiveChatSession} = require("./session");
const {getRecentHistory} = require("./history");

const hash = (value) => createHash("sha256")
    .update(JSON.stringify(value)).digest("hex");
const CONFLICT_FIELDS = new Set([
  "soloConversar", "temas", "modalidad", "preferenciaGenero",
  "preferenciaEdad", "enfoque",
]);
const AI_UNAVAILABLE_REPLY = "La asistencia con IA no está disponible en este momento. Puedes intentarlo nuevamente en unos minutos o continuar seleccionando una de las opciones.";

function chatLimits(env = process.env) {
  try {
    const policy = JSON.parse(env.CHAT_LIMITS_JSON || "null");
    if (!policy || !/^[\w.-]{1,80}$/.test(policy.version) ||
        ![policy.requestsPerDay, policy.globalConcurrency]
            .every((value) => Number.isInteger(value) && value > 0 && value <= 10000)) {
      return null;
    }
    return policy;
  } catch (_) {
    return null;
  }
}

function createSurveyService({
  db, generate, now = Date.now, limits = chatLimits,
  inputMode = surveyInputMode,
}) {
  async function send(uid, data) {
    const message = typeof data.message === "string" ? data.message.trim() : "";
    if (!message || message.length > 1200 ||
        !/^[A-Za-z0-9_-]{8,100}$/.test(data.requestId || "")) {
      throw new HttpsError("invalid-argument", "Revisa el mensaje y su identificador.");
    }
    const config = limits();
    if (!config) {
      throw new HttpsError("failed-precondition", "Los límites de uso todavía no están configurados. La ayuda sigue disponible.");
    }
    const conversationRef = db.doc(`conversations/${uid}`);
    const profileRef = db.doc(`profiles/${uid}`);
    const operationRef = db.doc(`profile_chat_operations/${uid}_${data.requestId}`);
    const quotaRef = db.doc(`profile_chat_quotas/${uid}`);
    const globalRef = db.doc("runtime_controls/chat_concurrency");
    const fingerprint = hash({message, sessionId: data.sessionId || "", turnId: data.turnId || "", option: data.option || null});
    const lease = randomUUID();
    const globalKey = hash(uid);
    const claim = await db.runTransaction(async (tx) => {
      const [conversationSnap, profileSnap, operationSnap, quotaSnap, globalSnap] = await Promise.all(
          [conversationRef, profileRef, operationRef, quotaRef, globalRef]
              .map((ref) => tx.get(ref)));
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
      const quota = quotaSnap.data() || {};
      const global = globalSnap.data() || {};
      const day = new Date(now()).toISOString().slice(0, 10);
      const count = quota.day === day ? quota.count : 0;
      const leases = Object.fromEntries(Object.entries(global.leases || {})
          .filter(([, item]) => item.until > now()));
      if (quota.leaseUntil > now()) throw new HttpsError("aborted", "Ya tienes un envío en curso.");
      if (count >= config.requestsPerDay || Object.keys(leases).length >= config.globalConcurrency) throw new HttpsError("resource-exhausted", "Se alcanzó el límite de uso. La ayuda sigue disponible.");
      const session = getActiveChatSession(conversation);
      const sessionId = session.id;
      const saved = profileSnap.data() || {};
      const profile = finalizeProfileForMatching({...PROFILE_DEFAULTS,
        ...sanitizeModelProfileData(saved),
        riesgoSuicida: false,
        summaryConfirmed: Boolean(saved.summaryConfirmed), sessionId});
      const activeTurn = conversation.activeTurn || makeTurn(profile, sessionId);
      if (inputMode() === "guided" && !getCrisisResult(message) && !data.option) {
        throw new HttpsError("invalid-argument", "Elige una de las opciones de la pregunta actual o ajusta tus preferencias.");
      }
      const until = now() + 90000;
      tx.set(operationRef, {uid, requestId: data.requestId, fingerprint, sessionId,
        status: "processing", lease, leaseUntil: until,
        createdAt: FieldValue.serverTimestamp()});
      tx.set(quotaRef, {day, count: count + 1, lease, leaseUntil: until,
        policyVersion: config.version});
      tx.set(globalRef, {leases: {...leases, [globalKey]: {lease, until}}});
      tx.set(conversationRef, {uid, activeSessionId: sessionId, activeTurn,
        sessionStartedAt: session.startedAt, updatedAt: FieldValue.serverTimestamp()}, {merge: true});
      return {profile, sessionId, activeTurn, noProgressTurns: Number(conversation.noProgressTurns || 0), helpReminder: Boolean(conversation.helpReminder)};
    });
    if (claim.cached) return claim.cached;

    try {
      const literalCrisis = getCrisisResult(message);
      const local = data.option ? localAnswer(message, claim.activeTurn) : null;
      const answer = literalCrisis || local || await generate({
        currentProfile: claim.profile,
        history: await getRecentHistory(conversationRef.collection("messages"), claim.sessionId),
        latestUserMessage: message,
      });
      const helpMode = Boolean(literalCrisis || answer.riskSignal === "contextual");
      let clean = helpMode ? {} : sanitizeModelProfileData(answer.data || {});
      let conflict = null;
      let pendingConflicts = [];
      if (!helpMode && !answer.confirmedOverwrite) {
        const conflicts = findConflicts(claim.profile, clean);
        conflict = conflicts[0] || null;
        pendingConflicts = conflicts.slice(1);
        if (conflicts.length) {
          clean = {...clean};
          conflicts.forEach(({field}) => delete clean[field]);
        }
      }
      const changed = hasNewInformation(claim.profile, clean);
      const profile = helpMode ? claim.profile : finalizeProfileForMatching({
        ...claim.profile,
        ...clean,
        summaryConfirmed: changed ? false : claim.profile.summaryConfirmed,
      });
      const confirmation = conflict ? {
        field: conflict.field,
        previous: conflict.previous,
        next: conflict.next,
        data: {[conflict.field]: conflict.next},
        pendingConflicts: pendingConflicts.map((item) => ({...item,
          data: {[item.field]: item.next}})),
      } : answer.nextConfirmation || answer.confirmSoloConversar === true;
      const activeTurn = helpMode ? claim.activeTurn :
        makeTurn(profile, claim.sessionId, confirmation);
      const answeredOverwrite = claim.activeTurn.kind ===
        "overwrite_confirmation" && Boolean(data.option);
      const noProgressTurns = helpMode || answeredOverwrite ?
        claim.noProgressTurns :
        changed ? 0 : Math.min(claim.noProgressTurns + 1, 5);
      const redirected = !helpMode && noProgressTurns >= 5 &&
        activeTurn.status === "active";
      const reply = helpMode ? (literalCrisis?.reply || answer.reply || CRISIS_REPLY) :
        buildReply(answer, activeTurn, {redirected, conflict, changed});
      const result = {
        reply,
        data: clean,
        suggestedOptions: helpMode ? [] : activeTurn.options,
        profile,
        activeTurn,
        readyForRecommendations: profile.completado && profile.summaryConfirmed,
        summaryRequired: profile.completado && !profile.summaryConfirmed,
        helpMode,
        helpReminder: claim.helpReminder || helpMode,
        sessionId: claim.sessionId,
      };

      await db.runTransaction(async (tx) => {
        const [conversation, operation, quota, global] = await Promise.all(
            [conversationRef, operationRef, quotaRef, globalRef]
                .map((ref) => tx.get(ref)));
        if (conversation.data()?.activeSessionId !== claim.sessionId ||
            conversation.data()?.activeTurn?.id !== claim.activeTurn.id ||
            operation.data()?.lease !== lease || operation.data()?.leaseUntil <= now()) {
          throw new HttpsError("aborted", "La respuesta llegó después de que cambió la conversación.");
        }
        const stamp = FieldValue.serverTimestamp();
        tx.set(profileRef, {...profile, uid, updatedAt: stamp});
        tx.set(conversationRef, {activeTurn, lastMessage: reply,
          noProgressTurns, helpReminder: claim.helpReminder || helpMode,
          updatedAt: stamp}, {merge: true});
        for (const [role, text] of [["user", message], ["assistant", reply]]) {
          tx.set(conversationRef.collection("messages").doc(`${role}_${data.requestId}`), {
            role, text, sessionId: claim.sessionId, requestId: data.requestId,
            createdAt: stamp,
            ...(role === "assistant" ? {
              suggestedOptions: helpMode ? [] : activeTurn.options,
              turnId: helpMode ? "" : activeTurn.id,
            } : {}),
          });
        }
        if (helpMode) {
          tx.set(conversationRef.collection("safety_events").doc(`safety_${data.requestId}`), {
            sessionId: claim.sessionId, requestId: data.requestId,
            signal: literalCrisis ? "literal" : "contextual",
            messageHash: hash(message),
            note: "Se mostraron recursos de ayuda; no constituye evaluación clínica.",
            createdAt: stamp,
          });
        }
        if (!claim.profile.completado && profile.completado) {
          tx.set(db.doc(`longitudinal_history/survey_${uid}_${data.requestId}`), {
            pacienteUid: uid, eventType: "initial_profile_completed",
            sourceType: "profile", sourceId: uid,
            title: "Preferencias iniciales registradas",
            summary: "Se registraron las preferencias para revisar el resumen.",
            visibility: "patient", createdBy: "system",
            occurredAt: new Date(now()).toISOString(), createdAt: stamp,
          });
        }
        tx.update(operationRef, {status: "completed", result, leaseUntil: 0,
          updatedAt: stamp});
        release(tx, quotaRef, globalRef, quota.data(), global.data(), lease, globalKey);
      });
      return result;
    } catch (error) {
      await db.runTransaction(async (tx) => {
        const [conversation, operation, quota, global] = await Promise.all(
            [conversationRef, operationRef, quotaRef, globalRef]
                .map((ref) => tx.get(ref)));
        if (operation.data()?.lease === lease &&
            operation.data()?.status !== "completed") {
          const unchanged = conversation.data()?.activeSessionId ===
              claim.sessionId && conversation.data()?.activeTurn?.id ===
              claim.activeTurn.id;
          if (unchanged && !(error instanceof HttpsError)) {
            const stamp = FieldValue.serverTimestamp();
            const fallbackReply = [AI_UNAVAILABLE_REPLY,
              claim.activeTurn.question].filter(Boolean).join(" ");
            tx.set(conversationRef.collection("messages")
                .doc(`user_${data.requestId}`), {
              role: "user", text: message, sessionId: claim.sessionId,
              requestId: data.requestId, createdAt: stamp,
            });
            tx.set(conversationRef.collection("messages")
                .doc(`assistant_${data.requestId}`), {
              role: "assistant", text: fallbackReply,
              sessionId: claim.sessionId, requestId: data.requestId,
              suggestedOptions: claim.activeTurn.options,
              turnId: claim.activeTurn.id, createdAt: stamp,
            });
            tx.set(conversationRef, {lastMessage: fallbackReply,
              updatedAt: stamp}, {merge: true});
          }
          tx.update(operationRef, {status: "failed", leaseUntil: 0,
            errorCode: "unconfirmed", updatedAt: FieldValue.serverTimestamp()});
        }
        release(tx, quotaRef, globalRef, quota.data(), global.data(), lease, globalKey);
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("unavailable", AI_UNAVAILABLE_REPLY,
          {historyPersisted: true});
    }
  }
  return {send};
}

function firstConflict(profile, patch) {
  return findConflicts(profile, patch)[0] || null;
}

function findConflicts(profile, patch) {
  return Object.entries(patch || {}).flatMap(([field, next]) => {
    if (!CONFLICT_FIELDS.has(field)) return [];
    const previous = profile[field];
    const hasPrevious = Array.isArray(previous) ? previous.length > 0 :
      typeof previous === "boolean" ? previous === true :
        String(previous || "").trim().length > 0;
    return hasPrevious && JSON.stringify(previous) !== JSON.stringify(next) ?
      [{field, previous, next}] : [];
  });
}

function hasNewInformation(profile, patch) {
  return Object.entries(patch || {}).some(([field, value]) =>
    JSON.stringify(profile[field]) !== JSON.stringify(value));
}

function buildReply(answer, turn, {redirected, conflict, changed}) {
  const empathy = typeof answer.reply === "string" ? answer.reply.trim() : "";
  if (conflict) return [empathy, turn.question].filter(Boolean).join(" ");
  if (turn.status === "complete") {
    return [empathy, "Ya tengo tus respuestas. Revisa el resumen antes de ver las recomendaciones."]
        .filter(Boolean).join(" ");
  }
  if (redirected) {
    return `Gracias por confiarme esto. Para poder acercarte a alguien que pueda acompañarte, necesito conocer una preferencia sencilla. ${turn.question}`;
  }
  const acknowledgement = empathy || (changed ? "Gracias, lo tendré en cuenta." : "Gracias por compartirlo.");
  return [acknowledgement, turn.question].filter(Boolean).join(" ");
}

function release(tx, quotaRef, globalRef, quota = {}, global = {}, lease, key) {
  if (quota.lease === lease) tx.update(quotaRef, {leaseUntil: 0});
  if (global.leases?.[key]?.lease === lease) {
    const leases = {...global.leases};
    delete leases[key];
    tx.set(globalRef, {leases});
  }
}

module.exports = {
  buildReply,
  AI_UNAVAILABLE_REPLY,
  chatLimits,
  createSurveyService,
  findConflicts,
  firstConflict,
  hasNewInformation,
};
