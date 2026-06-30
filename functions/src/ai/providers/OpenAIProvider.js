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
      options.model || process.env.OPENAI_MODEL || "gpt-4.1-mini";
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = options.baseUrl || "https://api.openai.com/v1";
  }

  async generateText(input = {}) {
    const data = await this.createChatCompletion(input);
    const text = data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content;

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
      responseFormat: {type: "json_object"},
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

  async createChatCompletion(input = {}) {
    if (!this.apiKey) {
      throw new AIProviderConfigurationError(
          "OpenAI no tiene OPENAI_API_KEY configurada.",
          {
            provider: this.name,
            model: input.model || this.defaultModel,
          },
      );
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model || this.defaultModel,
        messages: normalizeMessages(input.messages),
        temperature: getTemperature(input.temperature),
        max_tokens: input.maxTokens || 600,
        response_format: input.responseFormat,
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
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}

module.exports = {
  OpenAIProvider,
};
