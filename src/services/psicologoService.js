import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import { readDocument, readQuery, trackWrite } from "@/repositories/firestoreRepository";
import {
  CACHE_TTL,
  getOrFetch,
  invalidateCachePrefix,
} from "@/utils/requestCache";

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

export async function getTherapists(options = {}) {
  return getOrFetch({
    key: "therapists:all",
    ttl: CACHE_TTL.DIRECTORY,
    force: options.force,
    resource: THERAPISTS_COLLECTION,
    source: "getTherapists",
    fetcher: async () => {
      const therapistsRef = collection(db, THERAPISTS_COLLECTION);
      const therapistsQuery = query(therapistsRef, orderBy("nombre"));
      const snapshot = await readQuery(therapistsQuery, {
        resource: THERAPISTS_COLLECTION,
        source: "getTherapists",
      });

      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    },
  });
}

export async function getTherapistById(id, options = {}) {
  if (!id) return null;

  return getOrFetch({
    key: `therapist:id:${id}`,
    ttl: CACHE_TTL.DIRECTORY,
    force: options.force,
    resource: THERAPISTS_COLLECTION,
    source: "getTherapistById",
    fetcher: async () => {
      const snapshot = await readDocument(doc(db, THERAPISTS_COLLECTION, id), {
        resource: THERAPISTS_COLLECTION,
        source: "getTherapistById",
      });
      return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    },
  });
}

export async function getTherapistByUserUid(uid, options = {}) {
  if (!uid) return null;

  return getOrFetch({
    key: `therapist:uid:${uid}`,
    ttl: CACHE_TTL.PROFILE,
    force: options.force,
    resource: THERAPISTS_COLLECTION,
    source: "getTherapistByUserUid",
    fetcher: async () => {
      const therapistsQuery = query(
        collection(db, THERAPISTS_COLLECTION),
        where("uid", "==", uid),
        limit(1)
      );
      const snapshot = await readQuery(therapistsQuery, {
        resource: THERAPISTS_COLLECTION,
        source: "getTherapistByUserUid",
      });
      const item = snapshot.docs[0];
      return item ? { id: item.id, ...item.data() } : null;
    },
  });
}

export async function createTherapist(therapist) {
  const payload = sanitizeTherapistPayload(therapist);
  const therapistsRef = collection(db, THERAPISTS_COLLECTION);

  const docRef = await trackWrite({
    resource: THERAPISTS_COLLECTION,
    source: "createTherapist",
    operation: "addDoc",
    write: () => addDoc(therapistsRef, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  });
  invalidateTherapistCaches();

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function updateTherapist(id, therapist) {
  const payload = sanitizeTherapistPayload(therapist);
  const therapistRef = doc(db, THERAPISTS_COLLECTION, id);

  await trackWrite({
    resource: THERAPISTS_COLLECTION,
    source: "updateTherapist",
    operation: "updateDoc",
    write: () => updateDoc(therapistRef, {
      ...payload,
      updatedAt: serverTimestamp(),
    }),
  });
  invalidateTherapistCaches();

  return {
    id,
    ...payload,
  };
}

export async function deleteTherapist(id) {
  const therapistRef = doc(db, THERAPISTS_COLLECTION, id);
  await trackWrite({
    resource: THERAPISTS_COLLECTION,
    source: "deleteTherapist",
    operation: "deleteDoc",
    write: () => deleteDoc(therapistRef),
  });
  invalidateTherapistCaches();
}

function invalidateTherapistCaches() {
  invalidateCachePrefix("therapist");
}
