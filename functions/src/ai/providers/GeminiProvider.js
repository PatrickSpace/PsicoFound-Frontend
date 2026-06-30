const {GoogleGenAI} = require("@google/genai");
const {
  GEMINI_API_KEY,
  GEMINI_HTTP_TIMEOUT_MS,
  GEMINI_MODEL,
} = require("../../config");
const {
  AIProviderConfigurationError,
  AIProviderInvalidResponseError,
  AIProviderRateLimitError,
  AIProviderUnavailableError,
} = require("../errors");
const {messagesToPrompt} = require("../types");

class GeminiProvider {
  constructor(options = {}) {
    this.name = "gemini";
    this.defaultModel = options.model || GEMINI_MODEL;
    this.timeoutMs = options.timeoutMs || GEMINI_HTTP_TIMEOUT_MS;
  }

  async generateText(input = {}) {
    const result = await this.generateContent({
      ...input,
      responseMimeType: "text/plain",
    });

    return {
      text: result.text,
      provider: this.name,
      model: result.model,
      usage: result.usage,
    };
  }

  async generateStructuredOutput(input = {}) {
    const result = await this.generateContent({
      ...input,
      responseMimeType: "application/json",
    });

    try {
      return {
        data: JSON.parse(result.text),
        provider: this.name,
        model: result.model,
        usage: result.usage,
      };
    } catch (error) {
      throw new AIProviderInvalidResponseError(
          "No se pudo interpretar la respuesta estructurada de Gemini.",
          {
            provider: this.name,
            model: result.model,
            cause: error,
          },
      );
    }
  }

  async generateContent(input = {}) {
    const model = input.model || this.defaultModel;
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      throw new AIProviderConfigurationError(
          "Gemini no tiene GEMINI_API_KEY configurada.",
          {
            provider: this.name,
            model,
          },
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: this.timeoutMs,
      },
    });
    const startedAt = Date.now();

    try {
      const response = await ai.models.generateContent({
        model,
        contents: messagesToPrompt(input.messages),
        config: {
          temperature: getTemperature(input.temperature),
          maxOutputTokens: input.maxTokens || 600,
          thinkingConfig: {
            thinkingBudget: 0,
          },
          responseMimeType: input.responseMimeType,
          responseSchema: input.schema,
        },
      });

      return {
        text: response.text || "",
        model,
        elapsedMs: Date.now() - startedAt,
        usage: normalizeGeminiUsage(response.usageMetadata),
      };
    } catch (error) {
      throw normalizeGeminiError(error, {
        provider: this.name,
        model,
        elapsedMs: Date.now() - startedAt,
        timeoutMs: this.timeoutMs,
      });
    }
  }
}

function getTemperature(value) {
  return typeof value === "number" ? value : 0.2;
}

function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  try {
    return GEMINI_API_KEY.value();
  } catch (error) {
    return "";
  }
}

function normalizeGeminiUsage(usageMetadata = {}) {
  if (!usageMetadata || typeof usageMetadata !== "object") {
    return undefined;
  }

  return {
    inputTokens: usageMetadata.promptTokenCount,
    outputTokens: usageMetadata.candidatesTokenCount,
    totalTokens: usageMetadata.totalTokenCount,
  };
}

function normalizeGeminiError(error, context = {}) {
  const rawMessage = (error && error.message ? error.message : "").toString();
  const message = JSON.stringify(rawMessage).toLowerCase();
  const status = error && error.status;
  const baseContext = {
    provider: context.provider,
    model: context.model,
    cause: error,
  };

  if (status === 429 || message.includes("resource_exhausted")) {
    return new AIProviderRateLimitError("Gemini excedio cuota o limite.", {
      ...baseContext,
    });
  }

  if (
    status >= 500 ||
    context.elapsedMs >= context.timeoutMs - 1000 ||
    message.includes("timeout") ||
    message.includes("deadline") ||
    message.includes("abort") ||
    message.includes("etimedout")
  ) {
    return new AIProviderUnavailableError("Gemini no esta disponible.", {
      ...baseContext,
    });
  }

  return new AIProviderUnavailableError("Gemini fallo al generar respuesta.", {
    ...baseContext,
  });
}

module.exports = {
  GeminiProvider,
};
