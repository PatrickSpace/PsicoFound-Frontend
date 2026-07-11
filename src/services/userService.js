import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import {
  APP_ROLES,
  getLegacyRoleFromRoles,
  getUserRoles,
  normalizeRoles,
} from "@/utils/roles";

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
  const currentUser = await getUserById(uid);
  const roles = normalizeRoles([
    ...getUserRoles(currentUser, { defaultPatient: true }),
    APP_ROLES.PSYCHOLOGIST,
  ]);
  const payload = {
    roles,
    rol: getLegacyRoleFromRoles(roles),
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

export async function upsertUserByAdmin(uid, data = {}) {
  if (!uid) {
    throw new Error("El UID del usuario es obligatorio.");
  }

  const roles = normalizeRoles(data.roles?.length ? data.roles : [APP_ROLES.PATIENT]);
  const userRef = doc(db, USERS_COLLECTION, uid);
  const payload = {
    id: uid,
    email: data.email || "",
    nombre: data.nombre || "",
    fechaNacimiento: data.fechaNacimiento || "",
    telefono: data.telefono || "",
    roles,
    rol: getLegacyRoleFromRoles(roles),
    updatedAt: serverTimestamp(),
  };

  if (data.includeCreatedAt) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(userRef, payload, { merge: true });

  return {
    id: uid,
    ...payload,
  };
}

export async function updateUserRolesByAdmin(uid, roles = []) {
  if (!uid) {
    throw new Error("No se encontró el usuario a actualizar.");
  }

  const normalizedRoles = normalizeRoles(roles);

  if (!normalizedRoles.length) {
    throw new Error("El usuario debe tener al menos un rol.");
  }

  const userRef = doc(db, USERS_COLLECTION, uid);
  const payload = {
    roles: normalizedRoles,
    rol: getLegacyRoleFromRoles(normalizedRoles),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, payload, { merge: true });

  return {
    id: uid,
    ...payload,
  };
}

export async function deleteUserProfileByAdmin(uid) {
  if (!uid) {
    throw new Error("No se encontró el usuario a eliminar.");
  }

  await deleteDoc(doc(db, USERS_COLLECTION, uid));
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
    return getUserRoles(user, { defaultPatient: true }).includes(APP_ROLES.PATIENT);
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
