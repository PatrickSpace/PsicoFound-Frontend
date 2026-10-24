import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, getDocs, query, where } from "firebase/firestore";
import { app } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";

const functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1");
export async function callFollowup(name, data) {
  return (await httpsCallable(functions, name)(data)).data;
}
export async function getTherapySharedSummary(therapyId, mode) {
  return callFollowup("getTherapySharedSummary", { therapyId, mode });
}
export async function getTherapySharedHistory(therapyId, cursor = "") {
  return callFollowup("getTherapySharedHistory", {
    therapyId,
    mode: "psychologist",
    cursor,
    pageSize: 50,
  });
}
export async function getItemsForTherapies(name, therapies) {
  const groups = await Promise.all(therapies.map(async (therapy) => {
    const snapshot = await getDocs(query(collection(db, name), where("terapiaId", "==", therapy.id)));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  }));
  return groups.flat();
}
