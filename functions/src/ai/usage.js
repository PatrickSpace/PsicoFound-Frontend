/* eslint-disable max-len */
// USD / 1M tokens -> nano-USD / token. Standard, short context, checked 2026-10-31.
const LUNA_PRICING = Object.freeze({
  version: "openai-standard-2026-10-31", model: "gpt-6-luna",
  input: 100, cachedInput: 10, cacheWrite: 125, output: 500,
});
const USAGE_KEYS = ["inputTokens", "outputTokens", "totalTokens", "cachedInputTokens", "cacheWriteTokens", "reasoningTokens"];
function sanitizeUsage(usage) {
  if (!usage || typeof usage !== "object") return undefined;
  return Object.fromEntries(USAGE_KEYS.filter((key) => Number.isSafeInteger(usage[key]) && usage[key] >= 0).map((key) => [key, usage[key]]));
}
function estimateCostNanoUsd(usage, rates = LUNA_PRICING) {
  const clean = sanitizeUsage(usage);
  if (!clean || !Number.isSafeInteger(clean.inputTokens) || !Number.isSafeInteger(clean.outputTokens)) return null;
  const cached = clean.cachedInputTokens || 0;
  const written = clean.cacheWriteTokens || 0;
  if (cached + written > clean.inputTokens) return null;
  const cost = (clean.inputTokens - cached - written) * rates.input + cached * rates.cachedInput + written * rates.cacheWrite + clean.outputTokens * rates.output;
  return Number.isSafeInteger(cost) ? cost : null;
}
module.exports = {LUNA_PRICING, sanitizeUsage, estimateCostNanoUsd};
