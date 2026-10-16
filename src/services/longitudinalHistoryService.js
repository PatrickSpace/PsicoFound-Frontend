import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";

const LONGITUDINAL_HISTORY_COLLECTION = "longitudinal_history";

export async function getLongitudinalHistoryByTherapy(terapiaId) {
  if (!terapiaId) {
    return [];
  }

  const historyRef = collection(db, LONGITUDINAL_HISTORY_COLLECTION);
  const historyQuery = query(historyRef, where("terapiaId", "==", terapiaId));
  const snapshot = await getDocs(historyQuery);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort((a, b) => toDate(b.occurredAt) - toDate(a.occurredAt));
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
