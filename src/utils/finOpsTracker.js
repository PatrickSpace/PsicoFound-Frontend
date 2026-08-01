const environment = import.meta.env || {};
const enabled = environment.DEV && environment.VITE_FINOPS_DEBUG !== "false";
const events = [];
const totals = new Map();
const MAX_EVENTS = 300;

export const finOpsTracker = {
  track(event = {}) {
    if (!enabled) {
      return;
    }

    const safeEvent = sanitizeEvent(event);
    const counterKey = [
      safeEvent.type,
      safeEvent.resource,
      safeEvent.source,
    ].join(":");

    totals.set(counterKey, (totals.get(counterKey) || 0) + 1);
    events.push({
      ...safeEvent,
      timestamp: Date.now(),
    });

    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }
  },

  snapshot() {
    return {
      enabled,
      totals: Object.fromEntries(totals),
      events: events.map((event) => ({ ...event })),
    };
  },

  reset() {
    events.length = 0;
    totals.clear();
  },
};

function sanitizeEvent(event = {}) {
  return {
    type: safeLabel(event.type, "unknown"),
    resource: safeLabel(event.resource, "unknown"),
    source: safeLabel(event.source, "unknown"),
    operation: safeLabel(event.operation, ""),
    cacheHit: Boolean(event.cacheHit),
    deduplicated: Boolean(event.deduplicated),
    documentCount: toNonNegativeNumber(event.documentCount),
    durationMs: toNonNegativeNumber(event.durationMs),
    errorType: safeLabel(event.errorType, ""),
  };
}

function safeLabel(value, fallback) {
  const normalized = (value || "").toString().trim();
  return normalized ? normalized.slice(0, 80) : fallback;
}

function toNonNegativeNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : 0;
}

if (enabled && typeof window !== "undefined") {
  Object.defineProperty(window, "__LUREMS_FINOPS__", {
    configurable: true,
    value: finOpsTracker,
  });
}
