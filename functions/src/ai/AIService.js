/* eslint-disable max-len */
const {sanitizeUsage, estimateCostNanoUsd, LUNA_PRICING} = require("./usage");
const {correlation} = require("../operations/telemetry");
const logger = require("firebase-functions/logger");
const {AIProviderFactory} = require("./AIProviderFactory");
const {
  AIProviderUnavailableError,
  isRetryableAIError,
} = require("./errors");

class AIService {
  constructor(options = {}) {
    this.providerFactory = options.providerFactory || new AIProviderFactory();
    this.logger = options.logger || logger;
  }

  async generateText(input = {}) {
    return this.executeWithFallback("generateText", input);
  }

  async generateStructuredOutput(input = {}) {
    return this.executeWithFallback("generateStructuredOutput", input);
  }

  async executeWithFallback(method, input = {}) {
    const primaryProvider = this.providerFactory.createPrimaryProvider();
    const providers = [primaryProvider];
    const errors = [];

    for (let index = 0; index < providers.length; index += 1) {
      const provider = providers[index];
      const startedAt = Date.now();
      const fallbackAttempt = index > 0;

      try {
        const result = await provider[method](input);
        const elapsedMs = Date.now() - startedAt;

        this.logSuccess({
          provider: result.provider || provider.name,
          model: result.model || provider.defaultModel,
          elapsedMs,
          fallback: fallbackAttempt,
          usage: result.usage,
          operation: method,
        });

        return {
          ...result,
          fallbackUsed: fallbackAttempt,
        };
      } catch (error) {
        const elapsedMs = Date.now() - startedAt;
        errors.push(error);
        this.logFailure({
          provider: provider.name,
          model: provider.defaultModel,
          elapsedMs,
          fallback: fallbackAttempt,
          operation: method,
          error,
        });

        if (input.allowFallback === false || fallbackAttempt ||
            !isRetryableAIError(error)) {
          throw error;
        }

        // A broken or unused fallback must never block a successful primary.
        const fallback = this.providerFactory.createFallbackProvider();
        const sameModel = fallback &&
          (input.model || fallback.defaultModel) ===
          (input.model || primaryProvider.defaultModel);
        if (!fallback ||
            (fallback.name === primaryProvider.name && sameModel)) {
          throw error;
        }
        providers.push(fallback);
      }
    }

    throw new AIProviderUnavailableError(
        "No hay proveedores de IA disponibles.",
        {
          cause: errors[errors.length - 1],
        },
    );
  }

  logSuccess(entry = {}) {
    this.logger.info("ai provider success", {
      ...(correlation() ? {correlationId: correlation()} : {}),
      provider: entry.provider,
      model: entry.model,
      elapsedMs: entry.elapsedMs,
      fallback: Boolean(entry.fallback),
      operation: entry.operation,
      usage: sanitizeUsage(entry.usage),
      ...costTelemetry(entry.provider, entry.model, entry.usage),
    });
  }

  logFailure(entry = {}) {
    this.logger.warn("ai provider failure", {
      ...(correlation() ? {correlationId: correlation()} : {}),
      provider: entry.provider,
      model: entry.error?.model || entry.model,
      elapsedMs: entry.elapsedMs,
      fallback: Boolean(entry.fallback),
      operation: entry.operation,
      errorType: entry.error && entry.error.name,
      retryable: Boolean(entry.error && entry.error.retryable),
      usage: sanitizeUsage(entry.error?.usage),
      ...costTelemetry(entry.provider, entry.error?.model || entry.model, entry.error?.usage),
    });
  }
}

function costTelemetry(provider, model, usage) {
  if (provider !== "openai" || !(model === LUNA_PRICING.model || model?.startsWith(`${LUNA_PRICING.model}-`))) return {};
  const cost = estimateCostNanoUsd(usage);
  return cost === null ? {costStatus: "unknown"} : {
    estimatedCostNanoUsd: cost, pricingVersion: LUNA_PRICING.version,
  };
}

const aiService = new AIService();

module.exports = {
  AIService,
  aiService,
};
