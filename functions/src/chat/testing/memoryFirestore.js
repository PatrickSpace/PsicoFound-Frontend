/* eslint-disable max-len */
const assert = require("node:assert/strict");
// Isolated transactional mock: serialized commits, rollback, read-before-write,
// deterministic query ordering, and optional callback replay like Firestore.
function memoryFirestore() {
  const records = new Map();
  let queue = Promise.resolve();
  let tick = 1;
  const metrics = {reads: 0, writes: 0, historyDocuments: 0, replays: 0};
  const copy = (value) => {
    if (!value || typeof value !== "object" || value instanceof Date || typeof value.toMillis === "function") return value;
    if (value._methodName === "FieldValue.serverTimestamp") return new Date(tick);
    if (Array.isArray(value)) return value.map(copy);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
  };
  const snapshot = (path) => ({exists: records.has(path), data: () => copy(records.get(path))});
  const doc = (path) => ({path, collection: (name) => collection(`${path}/${name}`), get: async () => snapshot(path)});
  function collection(path) {
    const filters = [];
    let cap = Infinity;
    const query = {
      doc: (id) => doc(`${path}/${id}`),
      where(field, op, value) {
        assert.equal(op, "=="); filters.push([field, value]); return this;
      },
      orderBy() {
        return this;
      },
      limit(value) {
        cap = value; return this;
      },
      async get() {
        const entries = [...records.entries()].filter(([key, value]) => key.startsWith(`${path}/`) && key.split("/").length === path.split("/").length + 1 && filters.every(([field, match]) => value[field] === match));
        entries.sort(([a, av], [b, bv]) => Number(bv.createdAt) - Number(av.createdAt) || b.localeCompare(a));
        const docs = entries.slice(0, cap).map(([key]) => snapshot(key));
        metrics.historyDocuments += docs.length;
        return {docs};
      },
    };
    return query;
  }
  const db = {doc, collection, records, metrics, seed(path, data) {
    records.set(path, data);
  },
  runTransaction(run) {
    const operation = queue.then(async () => {
      async function attempt(commit) {
        const writes = [];
        const tx = {
          async get(ref) {
            assert.equal(writes.length, 0, "Firestore reads must precede writes"); metrics.reads++; return snapshot(ref.path);
          },
          set(ref, value, options) {
            writes.push({path: ref.path, value, merge: options?.merge});
          },
          create(ref, value) {
            assert.equal(records.has(ref.path), false, "create precondition"); writes.push({path: ref.path, value});
          },
          update(ref, value) {
            assert.ok(records.has(ref.path), "update precondition"); writes.push({path: ref.path, value, merge: true});
          },
        };
        const result = await run(tx);
        if (commit) {
          tick++;
          for (const write of writes) records.set(write.path, {...(write.merge ? records.get(write.path) : {}), ...copy(write.value)});
          metrics.writes += writes.length;
        }
        return result;
      }
      if (metrics.replays > 0) {
        metrics.replays--; await attempt(false);
      }
      return attempt(true);
    });
    queue = operation.catch(() => {});
    return operation;
  },
  };
  return db;
}
module.exports = {memoryFirestore};
