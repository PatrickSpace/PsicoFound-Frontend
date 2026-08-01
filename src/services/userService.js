import {
  collection,
  deleteDoc,
  doc,
  documentId,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import { readDocument, readQuery, trackWrite } from "@/repositories/firestoreRepository";
import {
  CACHE_TTL,
  getOrFetch,
  invalidateCache,
  invalidateCachePrefix,
} from "@/utils/requestCache";
import {
  APP_ROLES,
  getLegacyRoleFromRoles,
  getUserRoles,
  normalizeRoles,
} from "@/utils/roles";

const USERS_COLLECTION = "users";
const PROFILES_COLLECTION = "profiles";

export async function getUserById(uid, options = {}) {
  if (!uid) {
    return null;
  }

  return getOrFetch({
    key: "user",
    scope: uid,
    ttl: CACHE_TTL.PROFILE,
    force: options.force,
    resource: USERS_COLLECTION,
    source: "getUserById",
    fetcher: async () => {
      const userRef = doc(db, USERS_COLLECTION, uid);
      const snapshot = await readDocument(userRef, {
        resource: USERS_COLLECTION,
        source: "getUserById",
      });

      return snapshot.exists()
        ? { id: snapshot.id, ...snapshot.data() }
        : null;
    },
  });
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

  await trackWrite({
    resource: USERS_COLLECTION,
    source: "updateUserProfile",
    operation: "updateDoc",
    write: () => updateDoc(userRef, payload),
  });
  invalidateUserCaches(uid);

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

  await trackWrite({
    resource: USERS_COLLECTION,
    source: "upsertUserByAdmin",
    operation: "setDoc",
    write: () => setDoc(userRef, payload, { merge: true }),
  });
  invalidateUserCaches(uid);

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

  await trackWrite({
    resource: USERS_COLLECTION,
    source: "updateUserRolesByAdmin",
    operation: "setDoc",
    write: () => setDoc(userRef, payload, { merge: true }),
  });
  invalidateUserCaches(uid);

  return {
    id: uid,
    ...payload,
  };
}

export async function deleteUserProfileByAdmin(uid) {
  if (!uid) {
    throw new Error("No se encontró el usuario a eliminar.");
  }

  await trackWrite({
    resource: USERS_COLLECTION,
    source: "deleteUserProfileByAdmin",
    operation: "deleteDoc",
    write: () => deleteDoc(doc(db, USERS_COLLECTION, uid)),
  });
  invalidateUserCaches(uid);
}

export async function getUsers(options = {}) {
  return getOrFetch({
    key: "users:all",
    ttl: CACHE_TTL.ADMIN_LIST,
    force: options.force,
    resource: USERS_COLLECTION,
    source: "getUsers",
    fetcher: async () => {
      const usersRef = collection(db, USERS_COLLECTION);
      const snapshot = await readQuery(usersRef, {
        resource: USERS_COLLECTION,
        source: "getUsers",
      });

      return snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) =>
          (a.nombre || a.displayName || a.email || "").localeCompare(
            b.nombre || b.displayName || b.email || ""
          )
        );
    },
  });
}

export async function getPatientUsers() {
  const users = await getUsers();

  return users.filter((user) => {
    return getUserRoles(user, { defaultPatient: true }).includes(APP_ROLES.PATIENT);
  });
}

export async function getProfileByUserId(uid, options = {}) {
  if (!uid) {
    return null;
  }

  return getOrFetch({
    key: "initial-profile",
    scope: uid,
    ttl: CACHE_TTL.PROFILE,
    force: options.force,
    resource: PROFILES_COLLECTION,
    source: "getProfileByUserId",
    fetcher: async () => {
      const profileRef = doc(db, PROFILES_COLLECTION, uid);
      const snapshot = await readDocument(profileRef, {
        resource: PROFILES_COLLECTION,
        source: "getProfileByUserId",
      });

      return snapshot.exists()
        ? { id: snapshot.id, ...snapshot.data() }
        : null;
    },
  });
}

export async function getProfilesByUserIds(userIds = [], options = {}) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))].sort();

  if (!uniqueIds.length) return new Map();

  return getOrFetch({
    key: `profiles:batch:${uniqueIds.join(",")}`,
    ttl: CACHE_TTL.ADMIN_LIST,
    force: options.force,
    resource: PROFILES_COLLECTION,
    source: "getProfilesByUserIds",
    fetcher: async () => {
      const snapshots = await Promise.all(
        chunk(uniqueIds, 30).map((ids) =>
          readQuery(
            query(
              collection(db, PROFILES_COLLECTION),
              where(documentId(), "in", ids)
            ),
            {
              resource: PROFILES_COLLECTION,
              source: "getProfilesByUserIds",
            }
          )
        )
      );
      return new Map(
        snapshots
          .flatMap((snapshot) => snapshot.docs)
          .map((item) => [item.id, { id: item.id, ...item.data() }])
      );
    },
  });
}

export function invalidateUserCaches(uid) {
  if (uid) {
    invalidateCache({ key: "user", scope: uid });
    invalidateCache({ key: "initial-profile", scope: uid });
  }

  invalidateCachePrefix("users:");
  invalidateCachePrefix("profiles:");
}

function chunk(items, size) {
  const groups = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
}
