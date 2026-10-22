const {
  AIProviderConfigurationError,
  AIProviderInvalidResponseError,
  AIProviderRateLimitError,
  AIProviderUnavailableError,
} = require("../errors");
const {normalizeMessages} = require("../types");

class OpenAIProvider {
  constructor(options = {}) {
    this.name = "openai";
    this.defaultModel =
      options.model || process.env.OPENAI_MODEL || "gpt-6-luna";
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = options.baseUrl || "https://api.openai.com/v1";
  }

  async generateText(input = {}) {
    const data = await this.createResponse(input);
    const text = extractResponseText(data);

    if (!text) {
      throw new AIProviderInvalidResponseError(
          "OpenAI devolvio una respuesta sin texto.",
          {
            provider: this.name,
            model: input.model || this.defaultModel,
          },
      );
    }

    return {
      text,
      provider: this.name,
      model: data.model || input.model || this.defaultModel,
      usage: normalizeOpenAIUsage(data.usage),
    };
  }

  async generateStructuredOutput(input = {}) {
    const result = await this.generateText({
      ...input,
      responseFormat: input.schema ? {
        type: "json_schema",
        name: "profile_survey_turn",
        schema: toJsonSchema(input.schema),
        strict: false,
      } : {type: "json_object"},
    });

    try {
      return {
        data: JSON.parse(result.text),
        provider: result.provider,
        model: result.model,
        usage: result.usage,
      };
    } catch (error) {
      throw new AIProviderInvalidResponseError(
          "OpenAI devolvio JSON invalido.",
          {
            provider: this.name,
            model: result.model,
            cause: error,
          },
      );
    }
  }

  async createResponse(input = {}) {
    if (!this.apiKey) {
      throw new AIProviderConfigurationError(
          "OpenAI no tiene OPENAI_API_KEY configurada.",
          {
            provider: this.name,
            model: input.model || this.defaultModel,
          },
      );
    }

    const response = await fetch(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model || this.defaultModel,
        input: normalizeMessages(input.messages),
        temperature: getTemperature(input.temperature),
        max_output_tokens: input.maxTokens || 600,
        reasoning: {effort: "none"},
        store: false,
        text: input.responseFormat ? {
          format: input.responseFormat,
          verbosity: "low",
        } : undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 429) {
      throw new AIProviderRateLimitError("OpenAI excedio cuota o limite.", {
        provider: this.name,
        model: input.model || this.defaultModel,
      });
    }

    if (!response.ok) {
      throw new AIProviderUnavailableError("OpenAI no esta disponible.", {
        provider: this.name,
        model: input.model || this.defaultModel,
        cause: data.error,
      });
    }

    return data;
  }
}

function getTemperature(value) {
  return typeof value === "number" ? value : 0.2;
}

function normalizeOpenAIUsage(usage = {}) {
  if (!usage || typeof usage !== "object") {
    return undefined;
  }

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
  };
}

function extractResponseText(data = {}) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }
  return (Array.isArray(data.output) ? data.output : [])
      .flatMap((item) => Array.isArray(item.content) ? item.content : [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text || "")
      .join("");
}

function toJsonSchema(value) {
  if (Array.isArray(value)) return value.map(toJsonSchema);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    key === "type" && typeof item === "string" ? item.toLowerCase() :
      toJsonSchema(item),
  ]));
}

module.exports = {
  extractResponseText,
  OpenAIProvider,
  toJsonSchema,
};
