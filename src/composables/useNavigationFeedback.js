import { reactive, readonly } from "vue";

export function createNavigationFeedbackState() {
  return reactive({ pending: false, slow: false });
}

const navigationState = createNavigationFeedbackState();

export function useNavigationFeedback() {
  return readonly(navigationState);
}

// Install before the account guard so feedback starts before Auth, Firestore,
// access checks and lazy views are awaited.
export function installNavigationFeedback(router, {
  state = navigationState,
  slowAfterMs = 8_000,
  onError = () => {},
} = {}) {
  let activeRoute;
  let slowTimer;

  function finish(to) {
    // An older navigation can finish after a newer one has already started.
    if (to !== activeRoute) return false;
    clearTimeout(slowTimer);
    activeRoute = undefined;
    state.pending = false;
    state.slow = false;
    return true;
  }

  const removeBefore = router.beforeEach(to => {
    activeRoute = to;
    // Keep the same indicator and timer through account/onboarding redirects.
    if (state.pending) return;
    state.pending = true;
    state.slow = false;
    slowTimer = setTimeout(() => { state.slow = true; }, slowAfterMs);
  });
  const removeAfter = router.afterEach(to => { finish(to); });
  const removeError = router.onError((error, to) => {
    if (finish(to)) onError(error);
  });

  return () => {
    clearTimeout(slowTimer);
    removeBefore();
    removeAfter();
    removeError();
    state.pending = false;
    state.slow = false;
  };
}
