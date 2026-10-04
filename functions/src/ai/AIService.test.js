const assert = require("node:assert/strict");
const {test} = require("node:test");
const {AIService} = require("./AIService");
const {AIProviderFactory} = require("./AIProviderFactory");
const {
  AIProviderConfigurationError,
  AIProviderUnavailableError,
} = require("./errors");

test("AIProviderFactory selecciona el proveedor principal", () => {
  const factory = new AIProviderFactory({
    primaryProvider: "gemini",
    primaryModel: "gemini-2.5-flash",
  });
  const provider = factory.createPrimaryProvider();

  assert.equal(provider.name, "gemini");
  assert.equal(provider.defaultModel, "gemini-2.5-flash");
});

test("AIProviderFactory falla cuando no hay proveedor soportado", () => {
  const factory = new AIProviderFactory({
    primaryProvider: "",
  });

  assert.throws(
      () => factory.createProvider(""),
      AIProviderConfigurationError,
  );
});

test("AIService usa fallback con error temporal", async () => {
  const primary = createProvider("primary", async () => {
    throw new AIProviderUnavailableError("temporal", {
      provider: "primary",
      retryable: true,
    });
  });
  const fallback = createProvider("fallback", async () => ({
    text: "ok",
    provider: "fallback",
    model: "fallback-model",
  }));
  const service = new AIService({
    providerFactory: {
      createPrimaryProvider: () => primary,
      createFallbackProvider: () => fallback,
    },
    logger: createSilentLogger(),
  });

  const result = await service.generateText({
    messages: [{role: "user", content: "hola"}],
  });

  assert.equal(result.text, "ok");
  assert.equal(result.provider, "fallback");
  assert.equal(result.fallbackUsed, true);
});

test("AIService normaliza salida estructurada", async () => {
  const provider = {
    name: "test",
    defaultModel: "test-model",
    generateStructuredOutput: async () => ({
      data: {reply: "hola", data: {}},
      provider: "test",
      model: "test-model",
      usage: {inputTokens: 1, outputTokens: 2, totalTokens: 3},
    }),
  };
  const service = new AIService({
    providerFactory: {
      createPrimaryProvider: () => provider,
      createFallbackProvider: () => null,
    },
    logger: createSilentLogger(),
  });

  const result = await service.generateStructuredOutput({
    messages: [{role: "user", content: "hola"}],
  });

  assert.deepEqual(result.data, {reply: "hola", data: {}});
  assert.equal(result.provider, "test");
  assert.equal(result.model, "test-model");
  assert.equal(result.usage.totalTokens, 3);
});

function createProvider(name, implementation) {
  return {
    name,
    defaultModel: `${name}-model`,
    generateText: implementation,
  };
}

test("successful primary never constructs a broken fallback", async () => {
  const service = new AIService({
    providerFactory: {
      createPrimaryProvider: () => createProvider("gemini", async () =>
        ({text: "ok"})),
      createFallbackProvider: () => {
        throw new AIProviderConfigurationError("invalid fallback");
      },
    },
    logger: createSilentLogger(),
  });
  assert.equal((await service.generateText()).text, "ok");
});

test("non-retryable errors never initialize fallback", async () => {
  const error = new AIProviderConfigurationError("invalid primary");
  let attempts = 0;
  const service = new AIService({
    providerFactory: {
      createPrimaryProvider: () => createProvider("gemini", async () => {
        throw error;
      }),
      createFallbackProvider: () => attempts++,
    },
    logger: createSilentLogger(),
  });
  await assert.rejects(service.generateText(), (value) => value === error);
  assert.equal(attempts, 0);
});

test("same provider and effective model is never called twice", async () => {
  const error = new AIProviderUnavailableError("timeout");
  let calls = 0;
  const primary = createProvider("gemini", async () => {
    calls++;
    throw error;
  });
  const service = new AIService({
    providerFactory: {
      createPrimaryProvider: () => primary,
      createFallbackProvider: () => primary,
    },
    logger: createSilentLogger(),
  });
  await assert.rejects(service.generateText(), (value) => value === error);
  assert.equal(calls, 1);
});

test("same provider with a different model can be a fallback", async () => {
  const error = new AIProviderUnavailableError("timeout");
  let calls = 0;
  const service = new AIService({
    providerFactory: {
      createPrimaryProvider: () => createProvider("gemini", async () => {
        throw error;
      }),
      createFallbackProvider: () => ({
        ...createProvider("gemini", async () => {
          calls++;
          return {text: "ok"};
        }),
        defaultModel: "other-model",
      }),
    },
    logger: createSilentLogger(),
  });
  assert.equal((await service.generateText()).fallbackUsed, true);
  assert.equal(calls, 1);
  await assert.rejects(service.generateText({model: "explicit-model"}),
      (value) => value === error);
  assert.equal(calls, 1);
});

test("fallback failure is propagated without further attempts", async () => {
  const finalError = new AIProviderUnavailableError("fallback unavailable");
  let attempts = 0;
  const service = new AIService({
    providerFactory: {
      createPrimaryProvider: () => createProvider("primary", async () => {
        throw new AIProviderUnavailableError("primary unavailable");
      }),
      createFallbackProvider: () => createProvider("fallback", async () => {
        attempts++;
        throw finalError;
      }),
    },
    logger: createSilentLogger(),
  });
  await assert.rejects(service.generateText(), (value) => value === finalError);
  assert.equal(attempts, 1);
});

function createSilentLogger() {
  return {
    info: () => {},
    warn: () => {},
  };
}
