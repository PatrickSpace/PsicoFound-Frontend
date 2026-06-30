const {
  AI_MODEL,
  FALLBACK_AI_MODEL,
  FALLBACK_AI_PROVIDER,
  PRIMARY_AI_PROVIDER,
} = require("../config");
const {AIProviderConfigurationError} = require("./errors");
const {ClaudeProvider} = require("./providers/ClaudeProvider");
const {GeminiProvider} = require("./providers/GeminiProvider");
const {OpenAIProvider} = require("./providers/OpenAIProvider");

class AIProviderFactory {
  constructor(options = {}) {
    this.primaryProvider = normalizeProviderName(
        options.primaryProvider || process.env.PRIMARY_AI_PROVIDER ||
        PRIMARY_AI_PROVIDER,
    );
    this.fallbackProvider = normalizeProviderName(
        options.fallbackProvider || process.env.FALLBACK_AI_PROVIDER ||
        FALLBACK_AI_PROVIDER,
    );
    this.primaryModel = options.primaryModel || process.env.AI_MODEL ||
      process.env.GEMINI_MODEL || AI_MODEL;
    this.fallbackModel = options.fallbackModel ||
      process.env.FALLBACK_AI_MODEL || FALLBACK_AI_MODEL;
  }

  createPrimaryProvider() {
    return this.createProvider(this.primaryProvider, {
      model: this.primaryModel,
    });
  }

  createFallbackProvider() {
    if (!this.fallbackProvider) {
      return null;
    }

    return this.createProvider(this.fallbackProvider, {
      model: this.fallbackModel,
    });
  }

  createProvider(providerName, options = {}) {
    const name = normalizeProviderName(providerName);

    if (name === "gemini") {
      return new GeminiProvider(options);
    }

    if (name === "openai") {
      return new OpenAIProvider(options);
    }

    if (name === "claude" || name === "anthropic") {
      return new ClaudeProvider(options);
    }

    throw new AIProviderConfigurationError(
        `Proveedor de IA no soportado: ${providerName || "sin configurar"}.`,
        {
          provider: providerName || "",
        },
    );
  }
}

function normalizeProviderName(value = "") {
  return (value || "").toString().trim().toLowerCase();
}

module.exports = {
  AIProviderFactory,
};
