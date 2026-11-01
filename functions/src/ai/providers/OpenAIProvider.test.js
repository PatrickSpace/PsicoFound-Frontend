/* eslint-disable max-len */
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

test("provider timeout aborts fetch and never retries", async () => {
  let calls = 0; let signal;
  global.fetch = async (url, options) => {
    calls++; signal = options.signal;
    return new Promise(() => {});
  };
  const provider = new OpenAIProvider({apiKey: "synthetic-key"});
  await assert.rejects(provider.generateStructuredOutput({timeoutMs: 5}), /tiempo de espera/);
  assert.equal(signal.aborted, true);
  assert.equal(calls, 1);
});

test("deadline includes reading a stalled response body", async () => {
  let signal;
  global.fetch = async (url, options) => {
    signal = options.signal;
    return {ok: true, status: 200, json: async () => new Promise(() => {})};
  };
  const provider = new OpenAIProvider({apiKey: "synthetic-key"});
  await assert.rejects(provider.generateText({timeoutMs: 5}), /tiempo de espera/);
  assert.equal(signal.aborted, true);
});

test("invalid/truncated/empty JSON preserves billed usage including cached tokens", async () => {
  const usage = {input_tokens: 1000, output_tokens: 700, total_tokens: 1700,
    input_tokens_details: {cached_tokens: 400, cache_write_tokens: 200},
    output_tokens_details: {reasoning_tokens: 30}};
  for (const response of [
    {output_text: "{\"PRIVATE\":"},
    {output_text: "{\"ok\":true}", status: "incomplete"},
    {output_text: ""},
    {output_text: "null"},
  ]) {
    global.fetch = async () => ({ok: true, status: 200, json: async () => ({...response, usage, model: "gpt-6-luna"})});
    const provider = new OpenAIProvider({apiKey: "synthetic-key"});
    await assert.rejects(provider.generateStructuredOutput({maxTokens: 700}), (error) => {
      assert.equal(error.usage.cachedInputTokens, 400);
      assert.equal(error.usage.cacheWriteTokens, 200);
      assert.equal(error.usage.outputTokens, 700);
      assert.equal(error.usage.reasoningTokens, 30);
      assert.equal(error.cause, undefined);
      return error.name === "AIProviderInvalidResponseError";
    });
  }
});

test("HTTP 429 and 500 are single calls and retain any returned usage", async () => {
  for (const status of [429, 500]) {
    let calls = 0;
    global.fetch = async () => {
      calls++;
      return {ok: false, status, json: async () => ({usage: {input_tokens: 10, output_tokens: 1}})};
    };
    await assert.rejects(new OpenAIProvider({apiKey: "synthetic-key"}).generateText(), (error) => error.usage.inputTokens === 10);
    assert.equal(calls, 1);
  }
});
