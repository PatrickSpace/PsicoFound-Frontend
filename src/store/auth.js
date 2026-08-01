import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/plugins/Firebase/firebase";
import { useAppContextStore } from "@/store/appContext";
import { clearRequestCache } from "@/utils/requestCache";
import { clearSharedSubscriptions } from "@/utils/sharedSubscriptions";

export const useAuthStore = defineStore("auth", () => {
  const currentUser = ref(null);
  const isReady = ref(false);
  let unsubscribe = null;
  let readyPromise = null;
  let resolveReady = null;
  let previousUid = "";

  function initAuth() {
    if (unsubscribe) {
      return unsubscribe;
    }

    ensureReadyPromise();
    unsubscribe = onAuthStateChanged(auth, (user) => {
      const nextUid = user?.uid || "";

      if (previousUid && previousUid !== nextUid) {
        clearRequestCache();
        clearSharedSubscriptions();
      }

      previousUid = nextUid;
      currentUser.value = user;
      isReady.value = true;
      resolveReady?.(user);
      resolveReady = null;

      const appContext = useAppContextStore();
      if (user?.uid) {
        appContext.loadForUser(user.uid);
      } else {
        appContext.reset();
      }
    });

    return unsubscribe;
  }

  function waitUntilReady() {
    if (isReady.value) {
      return Promise.resolve(currentUser.value);
    }

    initAuth();
    return ensureReadyPromise();
  }

  function ensureReadyPromise() {
    if (!readyPromise) {
      readyPromise = new Promise((resolve) => {
        resolveReady = resolve;
      });
    }

    return readyPromise;
  }

  const isAuthenticated = computed(() => Boolean(currentUser.value));
  const userName = computed(() => {
    const user = currentUser.value;

    if (!user) {
      return "Usuario";
    }

    return user.displayName || user.email?.split("@")[0] || "Usuario";
  });

  return {
    currentUser,
    isReady,
    isAuthenticated,
    userName,
    initAuth,
    waitUntilReady,
  };
});
