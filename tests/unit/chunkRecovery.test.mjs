import test from 'node:test';
import assert from 'node:assert/strict';
import { installChunkRecovery, isChunkLoadError } from '../../src/utils/chunkRecovery.js';

function fixture() {
  const storage = new Map();
  const navigations = [];
  const router = {
    onError(fn) { this.error = fn; },
    afterEach(fn) { this.after = fn; },
  };
  const browser = {
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    location: { origin: 'https://app.lurems.lat', replace: url => navigations.push(url) },
  };
  installChunkRecovery(router, browser);
  return { router, browser, navigations };
}

test('recognizes Safari MIME and browser dynamic import failures, excluding account/network errors', () => {
  for (const message of ["'text/html' is not a valid JavaScript MIME type for module script 'https://app.lurems.lat/assets/VerifyEmailView-old.js'.", 'Failed to fetch dynamically imported module: /assets/old.js', 'Importing a module script failed.', 'error loading dynamically imported module']) {
    assert.equal(isChunkLoadError(new Error(message)), true);
  }
  for (const message of ['Firebase: Error (auth/network-request-failed).', 'Failed to fetch', 'permission-denied']) {
    assert.equal(isChunkLoadError(new Error(message)), false);
  }
});

test('recovers the intended verification URL once, preserving redirect and preventing reload loops', () => {
  const { router, navigations } = fixture();
  const to = { fullPath: '/verificar-correo?redirect=%2Fonboarding&delivery=sent' };
  router.error(new Error('Failed to fetch dynamically imported module'), to);
  const target = new URL(navigations[0]);
  assert.equal(target.pathname, '/verificar-correo');
  assert.equal(target.searchParams.get('redirect'), '/onboarding');
  assert.equal(target.searchParams.get('delivery'), 'sent');
  assert.ok(target.searchParams.get('_app_refresh'));
  router.error(new Error('Failed to fetch dynamically imported module'), to);
  assert.equal(navigations.length, 1);
});

test('does not reload ordinary errors, external URLs, or when storage is blocked', () => {
  const { router, browser, navigations } = fixture();
  router.error(new Error('permission-denied'), { fullPath: '/registro' });
  router.error(new Error('Importing a module script failed'), { fullPath: '//external.test' });
  browser.sessionStorage.getItem = () => { throw new Error('blocked'); };
  router.error(new Error('Importing a module script failed'), { fullPath: '/registro' });
  assert.equal(navigations.length, 0);
});

test('removes cache bypass after successful navigation while preserving router history state', () => {
  const { router, browser } = fixture();
  browser.location.href = 'https://app.lurems.lat/verificar-correo?redirect=%2Fonboarding&_app_refresh=123';
  const state = { position: 2, current: '/verificar-correo' };
  let replacement;
  browser.history = { state, replaceState: (...args) => { replacement = args; } };
  router.after({ query: { _app_refresh: '123' } }, {}, undefined);
  assert.equal(replacement[0], state);
  assert.equal(replacement[2], 'https://app.lurems.lat/verificar-correo?redirect=%2Fonboarding');
});
