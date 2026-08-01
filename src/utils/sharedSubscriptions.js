import { finOpsTracker } from "./finOpsTracker.js";

const subscriptions = new Map();
let subscriberSequence = 0;

export function subscribeShared({
  key,
  resource,
  source,
  open,
  onData,
  onError,
}) {
  if (!key || typeof open !== "function") {
    return () => {};
  }

  let entry = subscriptions.get(key);
  const isNewSubscription = !entry;
  const subscriberId = ++subscriberSequence;

  if (isNewSubscription) {
    entry = {
      consumers: new Map(),
      hasValue: false,
      lastValue: undefined,
      unsubscribe: null,
    };
    subscriptions.set(key, entry);
  }

  entry.consumers.set(subscriberId, { onData, onError });

  if (isNewSubscription) {
    entry.unsubscribe = open(
      (value, documentCount = 0) => {
        entry.hasValue = true;
        entry.lastValue = value;
        finOpsTracker.track({
          type: "listener-update",
          resource,
          source,
          documentCount,
        });
        entry.consumers.forEach((consumer) => consumer.onData?.(value));
      },
      (error) => {
        finOpsTracker.track({
          type: "listener-error",
          resource,
          source,
          errorType: error?.code || error?.name || "unknown",
        });
        entry.consumers.forEach((consumer) => consumer.onError?.(error));
      }
    );

    finOpsTracker.track({
      type: "listener-open",
      resource,
      source,
    });
  } else {
    finOpsTracker.track({
      type: "listener-shared",
      resource,
      source,
      deduplicated: true,
    });
  }

  if (!isNewSubscription && entry.hasValue) {
    queueMicrotask(() => {
      if (entry.consumers.has(subscriberId)) {
        onData?.(entry.lastValue);
      }
    });
  }

  return () => {
    const activeEntry = subscriptions.get(key);

    if (!activeEntry) {
      return;
    }

    activeEntry.consumers.delete(subscriberId);

    if (activeEntry.consumers.size === 0) {
      activeEntry.unsubscribe?.();
      subscriptions.delete(key);
      finOpsTracker.track({
        type: "listener-close",
        resource,
        source,
      });
    }
  };
}

export function clearSharedSubscriptions() {
  subscriptions.forEach((entry) => entry.unsubscribe?.());
  subscriptions.clear();
}
