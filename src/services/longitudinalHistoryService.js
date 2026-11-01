import { collection, documentId, getDocs, limit, orderBy, query, startAfter, where } from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";

export async function getLongitudinalHistoryPage(terapiaId, page = {}, sourceId = "") {
  if (!terapiaId) return { items: [], hasMore: false };
  const constraints = [where("terapiaId", "==", terapiaId), ...(sourceId ? [where("sourceId", "==", sourceId)] : [])];
  const pageSize = 50;
  const fetchPage = order => getDocs(query(collection(db, "longitudinal_history"), ...constraints,
    orderBy(order === "date" ? "occurredAt" : documentId(), order === "date" ? "desc" : "asc"),
    ...(page.cursor ? [startAfter(page.cursor)] : []), limit(pageSize)));
  let order = page.order || "date", snapshot;
  try { snapshot = await fetchPage(order); }
  catch (error) {
    // Existing installations retain complete access while the chronological index is provisioned.
    if (page.cursor || !String(error.code).includes("failed-precondition")) throw error;
    order = "id"; snapshot = await fetchPage(order);
  }
  return { items: snapshot.docs.map(item => ({ ...item.data(), id: item.id })), cursor: snapshot.docs.at(-1), hasMore: snapshot.size === pageSize, order };
}
