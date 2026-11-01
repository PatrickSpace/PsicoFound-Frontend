import { shallowReactive, reactive } from "vue";
import { collection, documentId, limit, onSnapshot, orderBy, query, startAfter } from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import { TABLE_LOADING_TIMEOUT_MS, TABLE_LOADING_TIMEOUT_MESSAGE } from "@/utils/tableLoadingTimeout";

export const adminCollectionPages = shallowReactive({});

// Deterministic ID order includes legacy documents without a creation timestamp.
// Each page owns exactly one listener, including when navigating backwards.
export function watchAdminPage(name, onData, onError, options = {}) {
  const pageSize = 50;
  const starts = [null];
  let index = 0, last, stopped = false, unsubscribe, timer, generation = 0;
  const state = reactive({ page: 1, count: 0, loading: true, hasNext: false, error: "", next, previous });
  adminCollectionPages[name] = state;
  function listen() {
    const current = ++generation;
    unsubscribe?.(); clearTimeout(timer);
    state.loading = true; state.error = "";
    const constraints = [...(options.constraints || []), orderBy(documentId()), ...(starts[index] ? [startAfter(starts[index])] : []), limit(pageSize)];
    const fail = error => {
      if (stopped || current !== generation) return;
      state.loading = false; state.error = error.message;
      clearTimeout(timer); unsubscribe?.(); onError?.(error);
    };
    timer = setTimeout(() => fail(new Error(TABLE_LOADING_TIMEOUT_MESSAGE)), TABLE_LOADING_TIMEOUT_MS);
    unsubscribe = onSnapshot(query(collection(db, name), ...constraints), snapshot => {
      if (stopped || current !== generation) return;
      clearTimeout(timer);
      last = snapshot.docs.at(-1);
      state.loading = false; state.count = snapshot.size; state.page = index + 1; state.hasNext = snapshot.size === pageSize;
      onData(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
    }, fail);
  }
  function next() {
    if (state.loading || !state.hasNext || !last) return;
    starts[++index] = last; listen();
  }
  function previous() { if (!state.loading && index > 0) { index--; listen(); } }
  listen();
  return () => {
    stopped = true; generation++; clearTimeout(timer); unsubscribe?.();
    if (adminCollectionPages[name] === state) delete adminCollectionPages[name];
  };
}
