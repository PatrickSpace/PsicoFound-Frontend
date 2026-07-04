import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import { createTherapist } from "@/services/psicologoService";
import { updateUserProfessionalAccess } from "@/services/userService";
import { defaultTherapistGradient } from "@/plugins/theme/tokens";

const REQUESTS_COLLECTION = "psychologist_requests";

export async function createPsychologistRequest(data = {}) {
  if (!data.userUid) {
    throw new Error("No se encontró el usuario solicitante.");
  }

  const existingRequest = await getLatestPsychologistRequestByUser(data.userUid);
  const existingStatus = normalizeStatus(existingRequest?.status);

  if (["pending", "approved"].includes(existingStatus)) {
    throw new Error(
      existingStatus === "approved"
        ? "Tu perfil profesional ya fue aprobado."
        : "Ya tienes una solicitud pendiente de revisión."
    );
  }

  const payload = sanitizeRequestPayload(data);
  const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), {
    ...payload,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...payload,
    status: "pending",
  };
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
  if (!request?.id || !request?.userUid) {
    throw new Error("Solicitud inválida.");
  }

  const therapist = await createTherapist({
    uid: request.userUid,
    nombre: request.professionalName || request.userName || "",
    description: request.professionalSummary || "",
    mensaje: request.motivation || "",
    especialidades: request.specialties || [],
    enfoques: request.approaches || [],
    genero: request.gender || "",
    modalidades: request.modalities || [],
    gradient: defaultTherapistGradient,
    activo: true,
  });

  await updateUserProfessionalAccess(request.userUid, {
    professionalProfileId: therapist.id,
    professionalAccessStatus: "approved",
    rol: "psicologo",
  });

  await updatePsychologistRequestStatus(request.id, {
    status: "approved",
    therapistId: therapist.id,
  });

  return therapist;
}

export async function rejectPsychologistRequest(requestId, rejectionReason = "") {
  if (!requestId) {
    throw new Error("Solicitud inválida.");
  }

  await updatePsychologistRequestStatus(requestId, {
    status: "rejected",
    rejectionReason: rejectionReason.trim(),
  });
}

async function updatePsychologistRequestStatus(requestId, data = {}) {
  const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
  await updateDoc(requestRef, {
    ...data,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function sanitizeRequestPayload(data = {}) {
  return {
    userUid: data.userUid || "",
    userName: data.userName || "",
    userEmail: data.userEmail || "",
    professionalName: data.professionalName || data.userName || "",
    licenseNumber: data.licenseNumber || "",
    professionalSummary: data.professionalSummary || "",
    motivation: data.motivation || "",
    specialties: normalizeStringArray(data.specialties),
    approaches: normalizeStringArray(data.approaches),
    modalities: normalizeStringArray(data.modalities),
    gender: data.gender || "",
  };
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => item.toString().trim()).filter(Boolean)
    : [];
}

function normalizeStatus(status = "") {
  return status.toString().trim().toLowerCase();
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
