import test from "node:test";
import assert from "node:assert/strict";
import { createRouter, createMemoryHistory, isNavigationFailure, NavigationFailureType } from "vue-router";
import { createNavigationFeedbackState, installNavigationFeedback } from "../../src/composables/useNavigationFeedback.js";

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function fixture(t, extraRoutes = []) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ["/", "/private", "/onboarding", "/other"].map(path => ({ path, component: {} })).concat(extraRoutes),
  });
  const state = createNavigationFeedbackState();
  const errors = [];
  t.after(installNavigationFeedback(router, { state, onError: error => errors.push(error) }));
  await router.push("/");
  return { router, state, errors };
}

test("shows feedback before an async account guard resolves, including the slow message", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { router, state } = await fixture(t);
  const entered = deferred(), account = deferred();
  router.beforeEach(to => {
    if (to.path === "/private") { entered.resolve(); return account.promise; }
  });
  const navigation = router.push("/private");
  await entered.promise;
  assert.equal(state.pending, true);
  assert.equal(router.currentRoute.value.path, "/");
  t.mock.timers.tick(7_999);
  assert.equal(state.slow, false);
  t.mock.timers.tick(1);
  assert.equal(state.slow, true);
  account.resolve();
  await navigation;
  assert.deepEqual({ ...state }, { pending: false, slow: false });
  t.mock.timers.tick(8_000);
  assert.equal(state.slow, false);
});

test("keeps feedback through an incomplete account redirect until the final screen is ready", async t => {
  const { router, state } = await fixture(t);
  const entered = deferred(), profile = deferred();
  router.beforeEach(to => {
    if (to.path === "/private") return { path: "/onboarding", query: { redirect: to.fullPath } };
    if (to.path === "/onboarding") { entered.resolve(); return profile.promise; }
  });
  const navigation = router.push("/private");
  await entered.promise;
  assert.equal(state.pending, true);
  profile.resolve();
  await navigation;
  assert.equal(router.currentRoute.value.fullPath, "/onboarding?redirect=/private");
  assert.equal(state.pending, false);
});

test("also covers loading a lazy screen after account checks finish", async t => {
  const entered = deferred(), chunk = deferred();
  const { router, state } = await fixture(t, [{ path: "/lazy", component: () => { entered.resolve(); return chunk.promise; } }]);
  const navigation = router.push("/lazy");
  await entered.promise;
  assert.equal(state.pending, true);
  chunk.resolve({ render() {} });
  await navigation;
  assert.equal(state.pending, false);
});

test("an older cancelled request cannot hide feedback for the newer navigation", async t => {
  const { router, state } = await fixture(t);
  const firstEntered = deferred(), first = deferred(), secondEntered = deferred(), second = deferred();
  router.beforeEach(to => {
    if (to.path === "/private") { firstEntered.resolve(); return first.promise; }
    if (to.path === "/other") { secondEntered.resolve(); return second.promise; }
  });
  const older = router.push("/private");
  await firstEntered.promise;
  const newer = router.push("/other");
  await secondEntered.promise;
  first.resolve();
  assert.ok(isNavigationFailure(await older, NavigationFailureType.cancelled));
  assert.equal(state.pending, true);
  second.resolve();
  await newer;
  assert.equal(state.pending, false);
});

test("unlocks navigation after a guard abort and after clicking the current route", async t => {
  const { router, state, errors } = await fixture(t);
  router.beforeEach(to => to.path === "/private" ? false : undefined);
  assert.ok(isNavigationFailure(await router.push("/private"), NavigationFailureType.aborted));
  assert.equal(state.pending, false);
  assert.ok(isNavigationFailure(await router.push("/"), NavigationFailureType.duplicated));
  assert.equal(state.pending, false);
  assert.equal(errors.length, 0);
});

test("a failed screen clears feedback and reports an error; a retry can succeed", async t => {
  const expected = new Error("Importing a module script failed.");
  let fail = true;
  const { router, state, errors } = await fixture(t, [{
    path: "/retry", component: () => fail ? Promise.reject(expected) : Promise.resolve({ render() {} }),
  }]);
  await assert.rejects(router.push("/retry"), expected);
  assert.equal(state.pending, false);
  assert.equal(state.slow, false);
  assert.deepEqual(errors, [expected]);
  fail = false;
  await router.push("/retry");
  assert.equal(router.currentRoute.value.path, "/retry");
  assert.equal(state.pending, false);
});
