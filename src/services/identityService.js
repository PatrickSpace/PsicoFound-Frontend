import { doc, collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
export { getUserById } from "./userService";
export { getTherapistByUserUid } from "./psicologoService";
export function watchUserIdentity(uid, onUser, onError) {
  return onSnapshot(doc(db, "users", uid), onUser, onError);
}
export function watchProfessionalIdentity(uid, onData, onError) {
  return onSnapshot(query(collection(db, "therapists"), where("uid", "==", uid), limit(1)), onData, onError);
}
