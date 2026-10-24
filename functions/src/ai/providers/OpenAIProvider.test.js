const assert = require("node:assert/strict");
const {afterEach, test} = require("node:test");
const {
  extractResponseText,
  OpenAIProvider,
  toJsonSchema,
} = require("./OpenAIProvider");

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

test(
    "OpenAIProvider uses Responses API with Luna and structured output",
    async () => {
      let request;
      global.fetch = async (url, options) => {
        request = {url, options, body: JSON.parse(options.body)};
        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: "gpt-6-luna",
            output_text: JSON.stringify({reply: "Te escucho.", data: {}}),
            usage: {input_tokens: 10, output_tokens: 5, total_tokens: 15},
          }),
        };
      };
      const provider = new OpenAIProvider({apiKey: "synthetic-key"});
      const result = await provider.generateStructuredOutput({
        messages: [{role: "user", content: "Hola"}],
        schema: {
          type: "OBJECT",
          properties: {reply: {type: "STRING"}, data: {type: "OBJECT"}},
        },
      });

      assert.equal(request.url, "https://api.openai.com/v1/responses");
      assert.equal(request.body.model, "gpt-6-luna");
      assert.equal(request.body.store, false);
      assert.equal(request.body.reasoning.effort, "none");
      assert.equal(request.body.text.format.type, "json_schema");
      assert.equal(request.body.text.format.schema.type, "object");
      assert.deepEqual(result.data, {reply: "Te escucho.", data: {}});
      assert.deepEqual(result.usage,
          {inputTokens: 10, outputTokens: 5, totalTokens: 15});
    },
);

test("Responses output and schema conversion support nested values", () => {
  assert.equal(extractResponseText({output: [{content: [
    {type: "output_text", text: "{\"ok\":"},
    {type: "output_text", text: "true}"},
  ]}]}), "{\"ok\":true}");
  assert.deepEqual(toJsonSchema({
    type: "ARRAY",
    items: {type: "STRING"},
  }), {
    type: "array",
    items: {type: "string"},
  });
});
