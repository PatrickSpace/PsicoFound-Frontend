import {
  addDoc,
  collection,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import { readQuery, trackWrite } from "@/repositories/firestoreRepository";
import {
  CACHE_TTL,
  getOrFetch,
  invalidateCachePrefix,
} from "@/utils/requestCache";

const LONGITUDINAL_HISTORY_COLLECTION = "longitudinal_history";

export async function appendLongitudinalEvent(data = {}) {
  if (!data.pacienteUid || !data.eventType) {
    throw new Error("Missing pacienteUid or eventType");
  }

  const payload = {
    pacienteUid: data.pacienteUid,
    eventType: data.eventType,
    sourceType: data.sourceType || "",
    sourceId: data.sourceId || "",
    terapiaId: data.terapiaId || "",
    title: data.title || "Evento registrado",
    summary: data.summary || "",
    metadata: data.metadata || {},
    visibility: data.visibility || "patient",
    createdBy: data.createdBy || data.pacienteUid,
    occurredAt: data.occurredAt || new Date().toISOString(),
    createdAt: serverTimestamp(),
  };

  const docRef = await trackWrite({
    resource: LONGITUDINAL_HISTORY_COLLECTION,
    source: "appendLongitudinalEvent",
    operation: "addDoc",
    write: () => addDoc(
      collection(db, LONGITUDINAL_HISTORY_COLLECTION),
      payload
    ),
  });
  invalidateCachePrefix("longitudinal-history:");

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function getLongitudinalHistoryByPatient(pacienteUid, options = {}) {
  if (!pacienteUid) {
    return [];
  }

  return getOrFetch({
    key: `longitudinal-history:patient:${pacienteUid}`,
    ttl: CACHE_TTL.CLINICAL_LIST,
    force: options.force,
    resource: LONGITUDINAL_HISTORY_COLLECTION,
    source: "getLongitudinalHistoryByPatient",
    fetcher: async () => {
      const historyQuery = query(
        collection(db, LONGITUDINAL_HISTORY_COLLECTION),
        where("pacienteUid", "==", pacienteUid)
      );
      const snapshot = await readQuery(historyQuery, {
        resource: LONGITUDINAL_HISTORY_COLLECTION,
        source: "getLongitudinalHistoryByPatient",
      });
      return mapAndSortHistory(snapshot.docs);
    },
  });
}

export async function getLongitudinalHistoryByTherapy(terapiaId, options = {}) {
  if (!terapiaId) {
    return [];
  }

  return getOrFetch({
    key: `longitudinal-history:therapy:${terapiaId}`,
    ttl: CACHE_TTL.CLINICAL_LIST,
    force: options.force,
    resource: LONGITUDINAL_HISTORY_COLLECTION,
    source: "getLongitudinalHistoryByTherapy",
    fetcher: async () => {
      const historyQuery = query(
        collection(db, LONGITUDINAL_HISTORY_COLLECTION),
        where("terapiaId", "==", terapiaId)
      );
      const snapshot = await readQuery(historyQuery, {
        resource: LONGITUDINAL_HISTORY_COLLECTION,
        source: "getLongitudinalHistoryByTherapy",
      });
      return mapAndSortHistory(snapshot.docs);
    },
  });
}

export async function getLongitudinalHistoryByTherapies(
  therapyIds = [],
  options = {}
) {
  const uniqueIds = [...new Set(therapyIds.filter(Boolean))].sort();

  if (!uniqueIds.length) return [];

  return getOrFetch({
    key: `longitudinal-history:therapies:${uniqueIds.join(",")}`,
    ttl: CACHE_TTL.CLINICAL_LIST,
    force: options.force,
    resource: LONGITUDINAL_HISTORY_COLLECTION,
    source: "getLongitudinalHistoryByTherapies",
    fetcher: async () => {
      const idGroups = chunk(uniqueIds, 30);
      const snapshots = await Promise.all(
        idGroups.map((ids) =>
          readQuery(
            query(
              collection(db, LONGITUDINAL_HISTORY_COLLECTION),
              where("terapiaId", "in", ids)
            ),
            {
              resource: LONGITUDINAL_HISTORY_COLLECTION,
              source: "getLongitudinalHistoryByTherapies",
            }
          )
        )
      );
      return mapAndSortHistory(snapshots.flatMap((snapshot) => snapshot.docs));
    },
  });
}

function mapAndSortHistory(documents) {
  return documents
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => toDate(b.occurredAt) - toDate(a.occurredAt));
}

function chunk(items, size) {
  const groups = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
}

function toDate(value) {
  if (!value) {
    return new Date(0);
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}
