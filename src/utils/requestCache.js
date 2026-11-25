import { finOpsTracker } from "./finOpsTracker.js";

const cache = new Map();
const inFlight = new Map();

export async function getOrFetch({
  key,
  scope = "global",
  ttl = 0,
  fetcher,
  force = false,
  resource = "unknown",
  source = "unknown",
}) {
  if (!key || typeof fetcher !== "function") {
    throw new Error("getOrFetch requiere una clave y una función fetcher.");
  }

  const cacheKey = buildCacheKey(scope, key);
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (!force && cached && cached.expiresAt > now) {
    finOpsTracker.track({
      type: "cache-hit",
      resource,
      source,
      cacheHit: true,
    });
    return cached.value;
  }

  if (!force && inFlight.has(cacheKey)) {
    finOpsTracker.track({
      type: "request-deduplicated",
      resource,
      source,
      deduplicated: true,
    });
    return inFlight.get(cacheKey);
  }

  finOpsTracker.track({
    type: "cache-miss",
    resource,
    source,
  });

  const request = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      if (ttl > 0 && inFlight.get(cacheKey) === request) {
        cache.set(cacheKey, {
          value,
          expiresAt: Date.now() + ttl,
        });
      }
      return value;
    })
    .finally(() => {
      if (inFlight.get(cacheKey) === request) {
        inFlight.delete(cacheKey);
      }
    });

  inFlight.set(cacheKey, request);
  return request;
}

export function invalidateCache({ key, scope = "global" }) {
  const cacheKey = buildCacheKey(scope, key);
  cache.delete(cacheKey);
  inFlight.delete(cacheKey);
}

export function invalidateCachePrefix(prefix, scope = "global") {
  const scopedPrefix = buildCacheKey(scope, prefix);

  for (const key of cache.keys()) {
    if (key.startsWith(scopedPrefix)) {
      cache.delete(key);
    }
  }

  for (const key of inFlight.keys()) {
    if (key.startsWith(scopedPrefix)) {
      inFlight.delete(key);
    }
  }
}

export function clearRequestCache() {
  cache.clear();
  inFlight.clear();
}

function buildCacheKey(scope, key) {
  return `${scope || "global"}:${key}`;
}
