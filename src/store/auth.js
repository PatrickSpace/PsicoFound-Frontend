import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { useAppContextStore } from "@/store/appContext";

export const useAuthStore = defineStore("auth", () => {
  const currentUser = ref(null);
  const isReady = ref(false);

  let initialization;
  function initAuth() {
    if (initialization) return initialization;
    initialization = initialize().catch(error => { initialization = null; throw error; });
    return initialization;
  }

  async function initialize() {
    const { observeAuth } = await import("@/plugins/Firebase/authObserver");
    return new Promise(resolve => {
      observeAuth(user => {
        currentUser.value = user;
        isReady.value = true;
        const appContext = useAppContextStore();
        if (user?.uid) appContext.loadForUser(user.uid).catch(error => console.error("Could not load account context", error));
        else appContext.reset();
        resolve(user);
      });
    });
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
