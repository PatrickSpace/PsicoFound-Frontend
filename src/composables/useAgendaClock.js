import { onBeforeUnmount, ref } from "vue";

// Re-evaluate day boundaries and expired slots while a view stays mounted.
export function useAgendaClock() {
  const now = ref(new Date());
  const timer = setInterval(() => { now.value = new Date(); }, 30000);
  onBeforeUnmount(() => clearInterval(timer));
  return now;
}
