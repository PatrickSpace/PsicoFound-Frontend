import { getDocs, onSnapshot } from 'firebase/firestore';
import { auth } from '@/plugins/Firebase/firebase';
import { finOpsTracker } from '@/utils/finOpsTracker';
import { getOrFetch } from '@/utils/requestCache';
import { subscribeShared } from '@/utils/sharedSubscriptions';

export async function readQuery(reference, context = {}) {
  const read = async () => {
    const startedAt = performance.now();
    try {
      const result = await getDocs(reference);
      finOpsTracker.track({ ...context, type: 'firestore-query', operation: 'getDocs',
        documentCount: result.size, durationMs: performance.now() - startedAt });
      return result;
    } catch (error) {
      finOpsTracker.track({ ...context, type: 'firestore-query-error', operation: 'getDocs',
        durationMs: performance.now() - startedAt, errorType: error?.code || 'unknown' });
      throw error;
    }
  };
  return context.key ? getOrFetch({ key: context.key, scope: auth.currentUser?.uid || 'anonymous',
    fetcher: read, resource: context.resource, source: context.source }) : read();
}

export function subscribeQuery(reference, context, onData, onError) {
  return subscribeShared({ ...context, onData, onError,
    open: (emit, emitError) => onSnapshot(reference, snapshot => emit(snapshot, snapshot.size), emitError) });
}
