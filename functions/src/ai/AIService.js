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

        if (fallbackAttempt || !isRetryableAIError(error)) {
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
      provider: entry.provider,
      model: entry.model,
      elapsedMs: entry.elapsedMs,
      fallback: Boolean(entry.fallback),
      operation: entry.operation,
      usage: sanitizeUsage(entry.usage),
    });
  }

  logFailure(entry = {}) {
    this.logger.warn("ai provider failure", {
      provider: entry.provider,
      model: entry.model,
      elapsedMs: entry.elapsedMs,
      fallback: Boolean(entry.fallback),
      operation: entry.operation,
      errorType: entry.error && entry.error.name,
      retryable: Boolean(entry.error && entry.error.retryable),
    });
  }
}

function sanitizeUsage(usage = {}) {
  if (!usage || typeof usage !== "object") {
    return undefined;
  }

  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  };
}

const aiService = new AIService();

module.exports = {
  AIService,
  aiService,
};
