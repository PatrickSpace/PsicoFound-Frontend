/**
 * @typedef {"system" | "user" | "assistant"} AIRole
 *
 * @typedef {Object} AIMessage
 * @property {AIRole} role
 * @property {string} content
 *
 * @typedef {Object} GenerateTextInput
 * @property {AIMessage[]} messages
 * @property {number=} temperature
 * @property {number=} maxTokens
 * @property {string=} model
 * @property {Record<string, unknown>=} metadata
 *
 * @typedef {Object} GenerateTextResult
 * @property {string} text
 * @property {string} provider
 * @property {string} model
 * @property {{inputTokens?: number, outputTokens?: number,
 * totalTokens?: number}=} usage
 *
 * @typedef {Object} StructuredOutputInput
 * @property {AIMessage[]} messages
 * @property {unknown=} schema
 * @property {number=} temperature
 * @property {number=} maxTokens
 * @property {string=} model
 * @property {Record<string, unknown>=} metadata
 *
 * @typedef {Object} StructuredOutputResult
 * @property {unknown} data
 * @property {string} provider
 * @property {string} model
 * @property {{inputTokens?: number, outputTokens?: number,
 * totalTokens?: number}=} usage
 *
 * @typedef {Object} EmbeddingInput
 * @property {string | string[]} input
 * @property {string=} model
 * @property {Record<string, unknown>=} metadata
 *
 * @typedef {Object} EmbeddingResult
 * @property {number[][]} embeddings
 * @property {string} provider
 * @property {string} model
 * @property {{inputTokens?: number, totalTokens?: number}=} usage
 *
 * @typedef {Object} AIProvider
 * @property {string} name
 * @property {string} defaultModel
 * @property {(input: GenerateTextInput) => Promise<GenerateTextResult>}
 * generateText
 * @property {(input: StructuredOutputInput) =>
 * Promise<StructuredOutputResult>} generateStructuredOutput
 * @property {((input: EmbeddingInput) => Promise<EmbeddingResult>)=}
 * generateEmbedding
 */

function normalizeMessages(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  return messages
      .map((message) => ({
        role: normalizeRole(message.role),
        content: (message.content || "").toString(),
      }))
      .filter((message) => message.content.trim().length > 0);
}

function normalizeRole(role = "user") {
  return ["system", "user", "assistant"].includes(role) ? role : "user";
}

function messagesToPrompt(messages = []) {
  return normalizeMessages(messages)
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n\n");
}

module.exports = {
  messagesToPrompt,
  normalizeMessages,
};
