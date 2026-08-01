import {
  collection,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import { readQuery } from "@/repositories/firestoreRepository";
import {
  CACHE_TTL,
  getOrFetch,
  invalidateCachePrefix,
} from "@/utils/requestCache";
import {
  reviewPsychologistApplication,
  submitPsychologistApplication,
} from "@/services/onboardingService";

const REQUESTS_COLLECTION = "psychologist_requests";

export async function createPsychologistRequest(data = {}) {
  const result = await submitPsychologistApplication({
    professionalName: data.professionalName || data.userName || "",
    licenseNumber: data.licenseNumber || "",
    country: data.country || "",
    phone: data.phone || "",
    yearsExperience: data.yearsExperience || 0,
    professionalSummary: data.professionalSummary || "",
    motivation: data.motivation || "",
    specialties: data.specialties || [],
    approaches: data.approaches || [],
    modalities: data.modalities || [],
    gender: data.gender || "",
    practiceLocation: data.practiceLocation || "",
  });

  invalidateCachePrefix("psychologist-request");
  return result.request;
}

export async function getLatestPsychologistRequestByUser(userUid, options = {}) {
  if (!userUid) {
    return null;
  }

  return getOrFetch({
    key: `psychologist-request:latest:${userUid}`,
    ttl: CACHE_TTL.PROFILE,
    force: options.force,
    resource: REQUESTS_COLLECTION,
    source: "getLatestPsychologistRequestByUser",
    fetcher: async () => {
      const requestsQuery = query(
        collection(db, REQUESTS_COLLECTION),
        where("userUid", "==", userUid),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snapshot = await readQuery(requestsQuery, {
        resource: REQUESTS_COLLECTION,
        source: "getLatestPsychologistRequestByUser",
      });
      const item = snapshot.docs[0];
      return item ? { id: item.id, ...item.data() } : null;
    },
  });
}

export async function getPsychologistRequests(options = {}) {
  return getOrFetch({
    key: "psychologist-request:admin-list",
    ttl: CACHE_TTL.ADMIN_LIST,
    force: options.force,
    resource: REQUESTS_COLLECTION,
    source: "getPsychologistRequests",
    fetcher: async () => {
      const requestsQuery = query(
        collection(db, REQUESTS_COLLECTION),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const snapshot = await readQuery(requestsQuery, {
        resource: REQUESTS_COLLECTION,
        source: "getPsychologistRequests",
      });
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    },
  });
}

export async function approvePsychologistRequest(request) {
  if (!request?.id) {
    throw new Error("Solicitud inválida.");
  }

  const result = await reviewPsychologistApplication({
    requestId: request.id,
    action: "approve",
  });
  invalidateCachePrefix("psychologist-request");
  return result;
}

export async function rejectPsychologistRequest(requestId, rejectionReason = "") {
  if (!requestId) {
    throw new Error("Solicitud inválida.");
  }

  const result = await reviewPsychologistApplication({
    requestId,
    action: "reject",
    rejectionReason: rejectionReason.trim(),
  });
  invalidateCachePrefix("psychologist-request");
  return result;
}
