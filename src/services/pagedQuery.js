import { getDocs, limit, onSnapshot, query, startAfter } from "firebase/firestore";

// One bounded live page. Older pages are snapshots loaded only on explicit navigation.
export function watchPagedQuery(base, onData, onError, pageSize = 30) {
  let stopped = false;
  let cursor = null;
  let head = [];
  let older = [];
  let browsing = false;
  let hasMore = false;
  let loading = false;
  const present = () => {
    if (stopped) return;
    const unique = new Map([...older, ...head].map(item => [item.id, item]));
    onData([...unique.values()].sort((a, b) => {
      const value = date => date?.toMillis?.() ?? new Date(date || 0).getTime();
      return value(b.createdAt) - value(a.createdAt) || b.id.localeCompare(a.id);
    }), { hasMore, loading, loadMore });
  };
  const unsubscribe = onSnapshot(query(base, limit(pageSize)), snapshot => {
    if (stopped) return;
    if (browsing) older = [...older, ...head];
    head = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    if (!browsing) { cursor = snapshot.docs.at(-1); hasMore = snapshot.size === pageSize; }
    present();
  }, error => { if (!stopped) onError?.(error); });
  async function loadMore() {
    if (stopped || loading || !hasMore || !cursor) return;
    loading = true; browsing = true; present();
    try {
      const snapshot = await getDocs(query(base, startAfter(cursor), limit(pageSize)));
      if (stopped) return;
      older.push(...snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
      cursor = snapshot.docs.at(-1) || cursor;
      hasMore = snapshot.size === pageSize;
    } catch (error) { if (!stopped) onError?.(error); }
    finally { loading = false; present(); }
  }
  return () => { stopped = true; unsubscribe(); head = []; older = []; };
}
