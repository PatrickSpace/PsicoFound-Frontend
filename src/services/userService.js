import {
  collection,
  doc,
  documentId,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";
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
const functions = getFunctions(
  app,
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1"
);
const upsertUserByAdminCallable = httpsCallable(functions, "upsertUserByAdmin");
const setUserAccountStatusByAdminCallable = httpsCallable(
  functions,
  "setUserAccountStatusByAdmin"
);
const seedQaMarketplaceDataCallable = httpsCallable(
  functions,
  "seedQaMarketplaceData"
);

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
  const payload = {
    uid,
    email: data.email || "",
    nombre: data.nombre || "",
    fechaNacimiento: data.fechaNacimiento || "",
    telefono: data.telefono || "",
    roles,
    rol: getLegacyRoleFromRoles(roles),
  };
  await upsertUserByAdminCallable(payload);
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

  const result = await upsertUserByAdminCallable({uid, roles: normalizedRoles});
  invalidateUserCaches(uid);

  return {
    id: uid,
    ...result.data,
  };
}

export async function setUserAccountStatusByAdmin(uid, status) {
  if (!uid) {
    throw new Error("No se encontró el usuario a actualizar.");
  }
  const result = await setUserAccountStatusByAdminCallable({uid, status});
  invalidateUserCaches(uid);
  return result.data;
}

export async function seedQaMarketplaceData(temporaryPassword) {
  const result = await seedQaMarketplaceDataCallable({temporaryPassword});
  invalidateCachePrefix("users:");
  invalidateCachePrefix("therap");
  invalidateCachePrefix("availability:");
  return result.data;
}

export async function getUsers(options = {}) {
  const pageSize = Math.min(Math.max(Number(options.pageSize || 50), 1), 100);
  const cursor = (options.cursor || "").toString();
  return getOrFetch({
    key: `users:page:${cursor || "first"}:${pageSize}`,
    ttl: CACHE_TTL.ADMIN_LIST,
    force: options.force,
    resource: USERS_COLLECTION,
    source: "getUsers",
    fetcher: async () => {
      const constraints = [orderBy(documentId()), limit(pageSize + 1)];
      if (cursor) constraints.splice(1, 0, startAfter(cursor));
      const usersQuery = query(collection(db, USERS_COLLECTION), ...constraints);
      const snapshot = await readQuery(usersQuery, {
        resource: USERS_COLLECTION,
        source: "getUsers",
      });

      const pageDocuments = snapshot.docs.slice(0, pageSize);
      const users = pageDocuments
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) =>
          (a.nombre || a.displayName || a.email || "").localeCompare(
            b.nombre || b.displayName || b.email || ""
          )
        );
      return {
        users,
        nextCursor: pageDocuments.at(-1)?.id || "",
        hasMore: snapshot.size > pageSize,
      };
    },
  });
}

export async function getPatientUsers() {
  const {users} = await getUsers({pageSize: 100});

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
