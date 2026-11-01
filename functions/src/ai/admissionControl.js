/* eslint-disable max-len */
const {createHash} = require("node:crypto");
const {FieldValue} = require("firebase-admin/firestore");
const {admissionPolicy, MAX_OUTPUT_TOKENS, OPERATION_LEASE_MS} = require("./admissionPolicy");
const {LUNA_PRICING, sanitizeUsage, estimateCostNanoUsd} = require("./usage");
const keyFor = (value) => createHash("sha256").update(value).digest("hex");

// A conservative reservation, NOT a token count: UTF-8 bytes plus framing/schema
// allowance, priced entirely at the highest input rate. Actual usage settles it.
function reservationFor(payload) {
  const inputTokenAllowance = Buffer.byteLength(JSON.stringify({messages: payload.messages, schema: payload.schema}), "utf8") + 1024;
  if (inputTokenAllowance > 272000) return null; // Keep Standard short-context pricing.
  return {inputTokenAllowance, reservedNanoUsd: inputTokenAllowance * Math.max(LUNA_PRICING.input, LUNA_PRICING.cacheWrite) + MAX_OUTPUT_TOKENS * LUNA_PRICING.output};
}
function createAdmissionControl({db, now = Date.now, policy = admissionPolicy}) {
  async function reserve({uid, requestId, sessionId, turnId, lease, payload, globalConcurrency}) {
    const p = policy();
    if (!p || now() < p.startsAtMs || now() >= p.endsAtMs) return {allowed: false, reason: "ai_policy_unavailable"};
    const reservation = reservationFor(payload);
    if (!reservation) return {allowed: false, reason: "context_too_large"};
    const accountKey = keyFor(uid);
    const operationKey = keyFor(`${uid}:${requestId}`);
    const usageRef = db.doc(`ai_usage_operations/${operationKey}`);
    const accountRef = db.doc(`ai_usage_accounts/${accountKey}`);
    const periodRef = db.doc(`ai_usage_periods/${p.periodId}`);
    const globalRef = db.doc("runtime_controls/chat_concurrency");
    const operationRef = db.doc(`profile_chat_operations/${uid}_${requestId}`);
    const conversationRef = db.doc(`conversations/${uid}`);
    return db.runTransaction(async (tx) => {
      const [usage, account, period, global, operation, conversation] = await Promise.all([usageRef, accountRef, periodRef, globalRef, operationRef, conversationRef].map((ref) => tx.get(ref).then((snap) => snap.data() || {})));
      // A reservation is single use, including after crashes or uncertain outcomes.
      if (usage.status) return {allowed: false, reason: "inference_already_reserved"};
      if (operation.lease !== lease || operation.status !== "processing" || operation.leaseUntil <= now() || conversation.activeSessionId !== sessionId || conversation.activeTurn?.id !== turnId) return {allowed: false, reason: "operation_changed"};
      if (now() < p.startsAtMs || now() >= p.endsAtMs) return {allowed: false, reason: "ai_policy_unavailable"};
      const sessionCount = account.sessionKey === keyFor(sessionId) ? account.sessionInferenceCount || 0 : 0;
      if ((account.inferenceCount || 0) >= p.accountInferenceLimit || (p.sessionInferenceLimit !== undefined && sessionCount >= p.sessionInferenceLimit)) return {allowed: false, reason: "account_ai_exhausted"};
      const terms = JSON.stringify({startsAt: p.startsAt, endsAt: p.endsAt, pricingVersion: p.pricingVersion});
      if (period.terms && period.terms !== terms) return {allowed: false, reason: "period_configuration_changed"};
      if (![period.spentNanoUsd ?? 0, period.reservedNanoUsd ?? 0].every((v) => Number.isSafeInteger(v) && v >= 0)) return {allowed: false, reason: "period_configuration_changed"};
      // Once initialized, the shared cap is authoritative across warm instances.
      const budgetNanoUsd = period.budgetNanoUsd ?? p.budgetNanoUsd;
      if (!Number.isSafeInteger(budgetNanoUsd) || budgetNanoUsd < 0) return {allowed: false, reason: "period_configuration_changed"};
      if ((period.spentNanoUsd || 0) + (period.reservedNanoUsd || 0) + reservation.reservedNanoUsd > budgetNanoUsd) return {allowed: false, reason: "global_ai_exhausted"};
      const leases = Object.fromEntries(Object.entries(global.leases || {}).filter(([, item]) => item.until > now()));
      if (!Number.isInteger(globalConcurrency) || globalConcurrency < 1 || Object.keys(leases).length >= globalConcurrency) return {allowed: false, reason: "ai_busy"};
      const stamp = FieldValue.serverTimestamp();
      tx.create(usageRef, {accountKey, periodId: p.periodId, status: "reserved", lease, ...reservation, pricing: LUNA_PRICING, createdAt: stamp});
      tx.set(accountRef, {inferenceCount: (account.inferenceCount || 0) + 1, sessionKey: keyFor(sessionId), sessionInferenceCount: sessionCount + 1, updatedAt: stamp});
      tx.set(periodRef, {terms, budgetNanoUsd, reservedNanoUsd: (period.reservedNanoUsd || 0) + reservation.reservedNanoUsd, inferenceCount: (period.inferenceCount || 0) + 1, updatedAt: stamp}, {merge: true});
      tx.set(globalRef, {leases: {...leases, [accountKey]: {lease, until: now() + OPERATION_LEASE_MS}}});
      return {allowed: true, usageRef, periodRef, globalRef, accountKey, lease};
    });
  }
  async function settle(ticket, {usage, outcome, model} = {}) {
    if (!ticket?.allowed) return;
    return db.runTransaction(async (tx) => {
      const [operation, period, global] = await Promise.all([ticket.usageRef, ticket.periodRef, ticket.globalRef].map((ref) => tx.get(ref).then((snap) => snap.data() || {})));
      if (operation.status !== "reserved" || operation.lease !== ticket.lease) return;
      const clean = sanitizeUsage(usage);
      const cost = model && model !== LUNA_PRICING.model && !model.startsWith(`${LUNA_PRICING.model}-`) ? null : estimateCostNanoUsd(clean, operation.pricing);
      // Unknown usage keeps its entire financial reservation. No timeout refund.
      const reservationExceeded = cost !== null && cost > operation.reservedNanoUsd;
      tx.update(ticket.usageRef, {reservationExceeded, status: cost === null ? "unconfirmed" : "settled", outcome,
        ...(clean ? {usage: clean} : {}), ...(cost === null ? {} : {estimatedCostNanoUsd: cost}),
        updatedAt: FieldValue.serverTimestamp()});
      if (cost !== null) {
        const tokens = Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, (period[key] || 0) + value]));
        tx.set(ticket.periodRef, {reservedNanoUsd: (period.reservedNanoUsd || 0) - operation.reservedNanoUsd,
          spentNanoUsd: (period.spentNanoUsd || 0) + cost, ...tokens, updatedAt: FieldValue.serverTimestamp()}, {merge: true});
      }
      if (global.leases?.[ticket.accountKey]?.lease === ticket.lease) {
        const leases = {...global.leases};
        delete leases[ticket.accountKey];
        tx.set(ticket.globalRef, {leases});
      }
      return {reservationExceeded};
    });
  }
  return {reserve, settle};
}
module.exports = {createAdmissionControl, keyFor, reservationFor};
