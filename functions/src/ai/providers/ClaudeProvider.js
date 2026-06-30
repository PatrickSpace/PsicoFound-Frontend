const {
  AIProviderConfigurationError,
  AIProviderInvalidResponseError,
  AIProviderRateLimitError,
  AIProviderUnavailableError,
} = require("../errors");
const {normalizeMessages} = require("../types");

class ClaudeProvider {
  constructor(options = {}) {
    this.name = "claude";
    this.defaultModel =
      options.model || process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
    this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.baseUrl = options.baseUrl || "https://api.anthropic.com/v1";
  }

  async generateText(input = {}) {
    const data = await this.createMessage(input);
    const text = Array.isArray(data.content) ?
      data.content
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("\n")
          .trim() :
      "";

    if (!text) {
      throw new AIProviderInvalidResponseError(
          "Claude devolvio una respuesta sin texto.",
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
      usage: normalizeClaudeUsage(data.usage),
    };
  }

  async generateStructuredOutput(input = {}) {
    const result = await this.generateText(input);

    try {
      return {
        data: JSON.parse(result.text),
        provider: result.provider,
        model: result.model,
        usage: result.usage,
      };
    } catch (error) {
      throw new AIProviderInvalidResponseError(
          "Claude devolvio JSON invalido.",
          {
            provider: this.name,
            model: result.model,
            cause: error,
          },
      );
    }
  }

  async createMessage(input = {}) {
    if (!this.apiKey) {
      throw new AIProviderConfigurationError(
          "Claude no tiene ANTHROPIC_API_KEY configurada.",
          {
            provider: this.name,
            model: input.model || this.defaultModel,
          },
      );
    }

    const messages = normalizeMessages(input.messages);
    const systemMessages = messages
        .filter((message) => message.role === "system")
        .map((message) => message.content)
        .join("\n\n");
    const conversationMessages = messages
        .filter((message) => message.role !== "system");
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model || this.defaultModel,
        system: systemMessages || undefined,
        messages: conversationMessages,
        temperature: getTemperature(input.temperature),
        max_tokens: input.maxTokens || 600,
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 429) {
      throw new AIProviderRateLimitError("Claude excedio cuota o limite.", {
        provider: this.name,
        model: input.model || this.defaultModel,
      });
    }

    if (!response.ok) {
      throw new AIProviderUnavailableError("Claude no esta disponible.", {
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

function normalizeClaudeUsage(usage = {}) {
  if (!usage || typeof usage !== "object") {
    return undefined;
  }

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.input_tokens && usage.output_tokens ?
      usage.input_tokens + usage.output_tokens :
      undefined,
  };
}

module.exports = {
  ClaudeProvider,
};
