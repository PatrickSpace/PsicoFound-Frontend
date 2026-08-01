import assert from "node:assert/strict";
import test from "node:test";
import {
  clearSharedSubscriptions,
  subscribeShared,
} from "../src/utils/sharedSubscriptions.js";

test.afterEach(() => {
  clearSharedSubscriptions();
});

test("comparte una suscripcion y la cierra al retirar el ultimo consumidor", async () => {
  let opens = 0;
  let closes = 0;
  const firstValues = [];
  const secondValues = [];
  const open = (emit) => {
    opens += 1;
    emit("initial", 1);
    return () => {
      closes += 1;
    };
  };

  const unsubscribeFirst = subscribeShared({
    key: "notifications:user-a",
    resource: "notifications",
    source: "test",
    open,
    onData: (value) => firstValues.push(value),
  });
  const unsubscribeSecond = subscribeShared({
    key: "notifications:user-a",
    resource: "notifications",
    source: "test",
    open,
    onData: (value) => secondValues.push(value),
  });

  await Promise.resolve();

  assert.equal(opens, 1);
  assert.deepEqual(firstValues, ["initial"]);
  assert.deepEqual(secondValues, ["initial"]);

  unsubscribeFirst();
  assert.equal(closes, 0);

  unsubscribeSecond();
  assert.equal(closes, 1);
});
