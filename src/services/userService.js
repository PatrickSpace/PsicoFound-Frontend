import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";

const USERS_COLLECTION = "users";
const PROFILES_COLLECTION = "profiles";

export async function getUserById(uid) {
  if (!uid) {
    return null;
  }

  const userRef = doc(db, USERS_COLLECTION, uid);
  const snapshot = await getDoc(userRef);

  return snapshot.exists()
    ? {
        id: snapshot.id,
        ...snapshot.data(),
      }
    : null;
}

export async function updateUserProfile(uid, data = {}) {
  if (!uid) {
    throw new Error("No se encontró el usuario a actualizar.");
  }

  const userRef = doc(db, USERS_COLLECTION, uid);
  const payload = {
    nombre: data.nombre || "",
    fechaNacimiento: data.fechaNacimiento || "",
    telefono: data.telefono || "",
    updatedAt: serverTimestamp(),
  };

  await updateDoc(userRef, payload);

  return {
    id: uid,
    ...payload,
  };
}

export async function updateUserProfessionalAccess(uid, data = {}) {
  if (!uid) {
    throw new Error("No se encontró el usuario a actualizar.");
  }

  const userRef = doc(db, USERS_COLLECTION, uid);
  const payload = {
    rol: data.rol || "psicologo",
    professionalAccessStatus: data.professionalAccessStatus || "approved",
    professionalProfileId: data.professionalProfileId || "",
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, payload, { merge: true });

  return {
    id: uid,
    ...payload,
  };
}

export async function getUsers() {
  const usersRef = collection(db, USERS_COLLECTION);
  const snapshot = await getDocs(usersRef);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort((a, b) =>
      (a.nombre || a.displayName || a.email || "").localeCompare(
        b.nombre || b.displayName || b.email || ""
      )
    );
}

export async function getPatientUsers() {
  const users = await getUsers();

  return users.filter((user) => {
    const role = (user.rol || user.role || "").toString().trim().toLowerCase();
    return !role || ["paciente", "patient"].includes(role);
  });
}

export async function getProfileByUserId(uid) {
  if (!uid) {
    return null;
  }

  const profileRef = doc(db, PROFILES_COLLECTION, uid);
  const snapshot = await getDoc(profileRef);

  return snapshot.exists()
    ? {
        id: snapshot.id,
        ...snapshot.data(),
      }
    : null;
}
