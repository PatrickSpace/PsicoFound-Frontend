import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";

const THERAPISTS_COLLECTION = "therapists";

function sanitizeTherapistPayload(therapist = {}) {
  return {
    uid: therapist.uid || "ejemplo",
    nombre: therapist.nombre || "",
    avatar: therapist.avatar || "",
    description: therapist.description || "",
    mensaje: therapist.mensaje || "",
    direccion: therapist.direccion || "",
    especialidades: Array.isArray(therapist.especialidades) ? therapist.especialidades : [],
    enfoques: Array.isArray(therapist.enfoques) ? therapist.enfoques : [],
    genero: therapist.genero || "",
    edad: therapist.edad ? Number(therapist.edad) : null,
    modalidades: Array.isArray(therapist.modalidades) ? therapist.modalidades : [],
    gradient: therapist.gradient || "",
    activo: therapist.activo ?? true,
  };
}

export async function getTherapists() {
  const therapistsRef = collection(db, THERAPISTS_COLLECTION);
  const therapistsQuery = query(therapistsRef, orderBy("nombre"));
  const snapshot = await getDocs(therapistsQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

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

export function watchTherapists(onData, onError) {
  const therapistsRef = collection(db, THERAPISTS_COLLECTION);
  const therapistsQuery = query(therapistsRef, orderBy("nombre"));

  return onSnapshot(
    therapistsQuery,
    (snapshot) => {
      const therapists = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      onData(therapists);
    },
    onError
  );
}

export async function createTherapist(therapist) {
  const payload = sanitizeTherapistPayload(therapist);
  const therapistsRef = collection(db, THERAPISTS_COLLECTION);

  const docRef = await addDoc(therapistsRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function updateTherapist(id, therapist) {
  const payload = sanitizeTherapistPayload(therapist);
  const therapistRef = doc(db, THERAPISTS_COLLECTION, id);

  await updateDoc(therapistRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });

  return {
    id,
    ...payload,
  };
}

export async function deleteTherapist(id) {
  const therapistRef = doc(db, THERAPISTS_COLLECTION, id);
  await deleteDoc(therapistRef);
}
