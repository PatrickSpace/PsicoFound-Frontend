import { computed, onBeforeUnmount, watch } from "vue";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";

// A generation owns subscriptions, forms and asynchronous completions for one account/view.
export function useAdminWorkspace(reset, start) {
  const auth = useAuthStore();
  const context = useAppContextStore();
  const active = computed(() => Boolean(auth.currentUser?.uid) && context.isAdmin && context.activeMode === "admin");
  let generation = 0;
  let cleanup;
  function capture() {
    const token = generation;
    return () => active.value && token === generation;
  }
  function reload() {
    generation++;
    cleanup?.();
    cleanup = null;
    reset();
    if (active.value) cleanup = start(capture());
  }
  watch(() => [auth.currentUser?.uid, context.activeMode, context.isAdmin], reload, { immediate: true, flush: "sync" });
  onBeforeUnmount(() => { generation++; cleanup?.(); reset(); });
  return { active, capture, reload };
}
