const RETRY_KEY = "lurems-chunk-recovery";
const RETRY_WINDOW_MS = 60_000;

export function isChunkLoadError(error) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading (?:CSS )?chunk .* failed|Unable to preload CSS|not a valid JavaScript MIME type for module script/i.test(
    error?.message || "",
  );
}

export function installChunkRecovery(router, browser) {
  router.onError((error, to) => {
    if (!isChunkLoadError(error)) return;
    error.message = "No pudimos cargar esta pantalla. Recarga la página para continuar con tu cuenta.";
    try {
      const now = Date.now();
      const previous = Number(browser.sessionStorage.getItem(RETRY_KEY));
      if (previous > 0 && now - previous < RETRY_WINDOW_MS) return;
      const target = new URL(to.fullPath, browser.location.origin);
      if (target.origin !== browser.location.origin) return;
      // Bypass an HTML response cached before the hosting cache policy changed.
      target.searchParams.set("_app_refresh", String(now));
      browser.sessionStorage.setItem(RETRY_KEY, String(now));
      browser.location.replace(target.href);
    } catch {
      // Storage can be unavailable; never risk an automatic reload loop.
    }
  });
  router.afterEach((to, _from, failure) => {
    if (failure || !to.query._app_refresh) return;
    const url = new URL(browser.location.href);
    url.searchParams.delete("_app_refresh");
    browser.history.replaceState(browser.history.state, "", url.href);
  });
}
