/* eslint-disable max-len */
const {LUNA_PRICING} = require("./usage");
const MAX_OUTPUT_TOKENS = 700;
const PROVIDER_TIMEOUT_MS = 25000;
const OPERATION_LEASE_MS = 90000;
const keyPattern = /^[\w.-]{1,80}$/;
function admissionPolicy(env = process.env, now = new Date()) {
  try {
    let p = JSON.parse(env.AI_ADMISSION_LIMITS_JSON || "null");
    if (p?.periodMode === "calendar_month_lima") {
      const local = new Date(now.getTime() - 5 * 3600000);
      const year = local.getUTCFullYear();
      const month = local.getUTCMonth();
      p = {...p, periodId: `admission-${year}-${String(month + 1).padStart(2, "0")}`,
        startsAt: new Date(Date.UTC(year, month, 1, 5)).toISOString(),
        endsAt: new Date(Date.UTC(year, month + 1, 1, 5)).toISOString()};
    }
    if (!p || typeof p.version !== "string" || typeof p.periodId !== "string" ||
        !keyPattern.test(p.version) || !keyPattern.test(p.periodId) ||
        ![p.accountInferenceLimit, p.budgetNanoUsd].every((v) => Number.isSafeInteger(v) && v >= 0) ||
        (p.sessionInferenceLimit !== undefined && (!Number.isSafeInteger(p.sessionInferenceLimit) || p.sessionInferenceLimit < 0)) ||
        ![p.startsAt, p.endsAt].every((v) => typeof v === "string" && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)) ||
        !Number.isFinite(Date.parse(p.startsAt)) || !Number.isFinite(Date.parse(p.endsAt)) ||
        Date.parse(p.startsAt) >= Date.parse(p.endsAt) ||
        p.pricingVersion !== LUNA_PRICING.version) return null;
    return {...p, startsAtMs: Date.parse(p.startsAt), endsAtMs: Date.parse(p.endsAt)};
  } catch (_) {
    return null;
  }
}
module.exports = {admissionPolicy, MAX_OUTPUT_TOKENS, PROVIDER_TIMEOUT_MS, OPERATION_LEASE_MS};
