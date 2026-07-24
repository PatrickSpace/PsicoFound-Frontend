import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
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

  return result.request;
}

export async function getLatestPsychologistRequestByUser(userUid) {
  if (!userUid) {
    return null;
  }

  const requestsRef = collection(db, REQUESTS_COLLECTION);
  const requestsQuery = query(requestsRef, where("userUid", "==", userUid));
  const snapshot = await getDocs(requestsQuery);
  const requests = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));

  return sortRequestsByCreatedAt(requests)[0] || null;
}

export async function getPsychologistRequests() {
  const requestsRef = collection(db, REQUESTS_COLLECTION);
  const requestsQuery = query(requestsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(requestsQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function approvePsychologistRequest(request) {
  if (!request?.id) {
    throw new Error("Solicitud inválida.");
  }

  return reviewPsychologistApplication({
    requestId: request.id,
    action: "approve",
  });
}

export async function rejectPsychologistRequest(requestId, rejectionReason = "") {
  if (!requestId) {
    throw new Error("Solicitud inválida.");
  }

  return reviewPsychologistApplication({
    requestId,
    action: "reject",
    rejectionReason: rejectionReason.trim(),
  });
}

function sortRequestsByCreatedAt(requests = []) {
  return [...requests].sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
}

function getTime(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  return new Date(value).getTime() || 0;
}
