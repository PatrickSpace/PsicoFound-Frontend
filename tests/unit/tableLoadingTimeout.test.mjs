import { test } from "node:test";
import assert from "node:assert/strict";
import { withTableLoadingTimeout, isTableLoadingTimeout, notifyTableLoadingTimeout, TABLE_LOADING_TIMEOUT_MS } from "../../src/utils/tableLoadingTimeout.js";

test("table timeout settles success/errors and clears its timer", async (t) => {
  const cleared = [];
  t.mock.method(globalThis, "setTimeout", () => 42);
  t.mock.method(globalThis, "clearTimeout", (id) => cleared.push(id));
  assert.equal(await withTableLoadingTimeout(Promise.resolve("rows")), "rows");
  const error = new Error("network");
  await assert.rejects(withTableLoadingTimeout(Promise.reject(error)), (value) => value === error);
  assert.deepEqual(cleared, [42, 42]);
});

test("table timeout rejects predictably with fake timers", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pending = withTableLoadingTimeout(new Promise(() => {}));
  const rejection = assert.rejects(pending, (error) => isTableLoadingTimeout(error) && error.name === "TableLoadingTimeoutError");
  t.mock.timers.tick(TABLE_LOADING_TIMEOUT_MS);
  await rejection;
});

test("notification remains a no-op outside browser", () => {
  assert.doesNotThrow(() => notifyTableLoadingTimeout());
  assert.equal(isTableLoadingTimeout(new Error("other")), false);
});
