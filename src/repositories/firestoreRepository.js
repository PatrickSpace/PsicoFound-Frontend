import {
  getDoc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { finOpsTracker } from "@/utils/finOpsTracker";
import { subscribeShared } from "@/utils/sharedSubscriptions";

export async function readDocument(reference, context = {}) {
  return trackRead({
    ...context,
    operation: "getDoc",
    read: () => getDoc(reference),
    count: (snapshot) => (snapshot.exists() ? 1 : 0),
  });
}

export async function readQuery(reference, context = {}) {
  return trackRead({
    ...context,
    operation: "getDocs",
    read: () => getDocs(reference),
    count: (snapshot) => snapshot.size,
  });
}

export function subscribeDocument(reference, context = {}, onData, onError) {
  return subscribeShared({
    key: context.key,
    resource: context.resource,
    source: context.source,
    onData,
    onError,
    open: (emit, emitError) =>
      onSnapshot(
        reference,
        (snapshot) => emit(snapshot, snapshot.exists() ? 1 : 0),
        emitError
      ),
  });
}

export function subscribeQuery(reference, context = {}, onData, onError) {
  return subscribeShared({
    key: context.key,
    resource: context.resource,
    source: context.source,
    onData,
    onError,
    open: (emit, emitError) =>
      onSnapshot(reference, (snapshot) => emit(snapshot, snapshot.size), emitError),
  });
}

export async function trackWrite({
  resource = "unknown",
  source = "unknown",
  operation = "write",
  write,
}) {
  const startedAt = performance.now();

  try {
    const result = await write();
    finOpsTracker.track({
      type: "firestore-write",
      resource,
      source,
      operation,
      durationMs: performance.now() - startedAt,
    });
    return result;
  } catch (error) {
    finOpsTracker.track({
      type: "firestore-write-error",
      resource,
      source,
      operation,
      durationMs: performance.now() - startedAt,
      errorType: error?.code || error?.name || "unknown",
    });
    throw error;
  }
}

async function trackRead({
  resource = "unknown",
  source = "unknown",
  operation,
  read,
  count,
}) {
  const startedAt = performance.now();

  try {
    const result = await read();
    finOpsTracker.track({
      type: "firestore-query",
      resource,
      source,
      operation,
      documentCount: count(result),
      durationMs: performance.now() - startedAt,
    });
    return result;
  } catch (error) {
    finOpsTracker.track({
      type: "firestore-query-error",
      resource,
      source,
      operation,
      durationMs: performance.now() - startedAt,
      errorType: error?.code || error?.name || "unknown",
    });
    throw error;
  }
}
