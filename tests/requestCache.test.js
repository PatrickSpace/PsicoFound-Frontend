import assert from "node:assert/strict";
import test from "node:test";
import {
  clearRequestCache,
  getOrFetch,
  invalidateCache,
} from "../src/utils/requestCache.js";

test.beforeEach(() => {
  clearRequestCache();
});

test.after(() => {
  clearRequestCache();
});

test("deduplica solicitudes simultaneas y reutiliza el valor dentro del TTL", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { value: calls };
  };

  const [first, second] = await Promise.all([
    getOrFetch({ key: "profile", scope: "user-a", ttl: 1_000, fetcher }),
    getOrFetch({ key: "profile", scope: "user-a", ttl: 1_000, fetcher }),
  ]);
  const cached = await getOrFetch({
    key: "profile",
    scope: "user-a",
    ttl: 1_000,
    fetcher,
  });

  assert.equal(calls, 1);
  assert.strictEqual(first, second);
  assert.strictEqual(second, cached);
});

test("separa datos por usuario e invalida una clave concreta", async () => {
  let calls = 0;
  const fetcher = async () => ++calls;

  assert.equal(
    await getOrFetch({ key: "profile", scope: "user-a", ttl: 1_000, fetcher }),
    1
  );
  assert.equal(
    await getOrFetch({ key: "profile", scope: "user-b", ttl: 1_000, fetcher }),
    2
  );

  invalidateCache({ key: "profile", scope: "user-a" });

  assert.equal(
    await getOrFetch({ key: "profile", scope: "user-a", ttl: 1_000, fetcher }),
    3
  );
  assert.equal(
    await getOrFetch({ key: "profile", scope: "user-b", ttl: 1_000, fetcher }),
    2
  );
});
