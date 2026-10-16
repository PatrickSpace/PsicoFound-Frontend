import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";

const THERAPISTS_COLLECTION = "therapists";

export async function getTherapistById(id) {
  if (!id) return null;

  const therapistRef = doc(db, THERAPISTS_COLLECTION, id);
  const snapshot = await getDoc(therapistRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function getTherapistByUserUid(uid) {
  if (!uid) return null;

  const therapistsRef = collection(db, THERAPISTS_COLLECTION);
  const therapistsQuery = query(therapistsRef, where("uid", "==", uid));
  const snapshot = await getDocs(therapistsQuery);
  const item = snapshot.docs[0];

  return item
    ? {
        id: item.id,
        ...item.data(),
      }
    : null;
}
