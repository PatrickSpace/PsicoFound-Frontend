/* eslint-disable max-len */
const {PROVIDER_TIMEOUT_MS} = require("../admissionPolicy");
const {sanitizeUsage} = require("../usage");
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

    if (!text || data.status === "incomplete" || data.status === "failed") {
      throw new AIProviderInvalidResponseError(
          "OpenAI devolvio una respuesta sin texto.",
          {
            provider: this.name,
            model: data.model || input.model || this.defaultModel,
            usage: normalizeOpenAIUsage(data.usage),
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
        data: parseStructuredObject(result.text),
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
            usage: result.usage,
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
            usage: {inputTokens: 0, outputTokens: 0, totalTokens: 0},
          },
      );
    }

    const controller = new AbortController();
    const timeoutMs = Number.isInteger(input.timeoutMs) && input.timeoutMs > 0 ?
      Math.min(input.timeoutMs, PROVIDER_TIMEOUT_MS) : PROVIDER_TIMEOUT_MS;
    let timer;
    const deadline = new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new AIProviderUnavailableError("OpenAI agoto el tiempo de espera.", {
          provider: this.name, model: input.model || this.defaultModel,
          retryable: false,
        }));
      }, timeoutMs);
    });
    try {
      return await Promise.race([(async () => {
        const response = await fetch(`${this.baseUrl}/responses`, {
          method: "POST",
          signal: controller.signal,
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
            service_tier: "default",
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
            usage: normalizeOpenAIUsage(data.usage),
          });
        }

        if (!response.ok) {
          throw new AIProviderUnavailableError("OpenAI no esta disponible.", {
            provider: this.name,
            model: input.model || this.defaultModel,
            usage: normalizeOpenAIUsage(data.usage),
          });
        }

        return data;
      })(), deadline]);
    } finally {
      clearTimeout(timer);
    }
  }
}

function parseStructuredObject(text) {
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a structured object");
  }
  return value;
}

function getTemperature(value) {
  return typeof value === "number" ? value : 0.2;
}

function normalizeOpenAIUsage(usage = {}) {
  if (!usage || typeof usage !== "object") {
    return undefined;
  }

  return sanitizeUsage({
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
    cachedInputTokens: usage.input_tokens_details?.cached_tokens,
    cacheWriteTokens: usage.input_tokens_details?.cache_write_tokens,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens,
  });
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
