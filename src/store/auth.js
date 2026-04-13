import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/plugins/Firebase/firebase";

export const useAuthStore = defineStore("auth", () => {
  const currentUser = ref(null);
  const isReady = ref(false);
  let unsubscribe = null;

  function initAuth() {
    if (unsubscribe) {
      return unsubscribe;
    }

    unsubscribe = onAuthStateChanged(auth, (user) => {
      currentUser.value = user;
      isReady.value = true;
    });

    return unsubscribe;
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
  };
});
