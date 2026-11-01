import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
export function observeLegalPublication(onData, onError) {
  return onSnapshot(doc(db, "legal_settings/current"), onData, onError);
}
