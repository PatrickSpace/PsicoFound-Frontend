import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  getDocs,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";

const THERAPIES_COLLECTION = "terapias";

export async function createTherapy(data = {}) {
  const therapiesRef = collection(db, THERAPIES_COLLECTION);
  const payload = {
    usuarioId: data.usuarioId || data.pacienteUid || "demo-user",
    pacienteUid: data.pacienteUid || "demo-user",
    pacienteNombre: data.pacienteNombre || "Usuario demo",
    pacienteEmail: data.pacienteEmail || "",
    terapeutaId: data.terapeutaId || "",
    terapeutaNombre: data.terapeutaNombre || "",
    modalidad: data.modalidad || "",
    estado: data.estado || "activo",
    fechaCreacion: data.fechaCreacion || new Date().toISOString(),
    citas: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(therapiesRef, payload);

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function appendAppointmentToTherapy(terapiaId, appointmentSummary) {
  const therapyRef = doc(db, THERAPIES_COLLECTION, terapiaId);

  await updateDoc(therapyRef, {
    citas: arrayUnion(appointmentSummary),
    updatedAt: serverTimestamp(),
  });
}

export async function replaceTherapyAppointments(terapiaId, citas = []) {
  const therapyRef = doc(db, THERAPIES_COLLECTION, terapiaId);

  await updateDoc(therapyRef, {
    citas,
    updatedAt: serverTimestamp(),
  });
}

export async function getTherapyById(terapiaId) {
  const therapyRef = doc(db, THERAPIES_COLLECTION, terapiaId);
  const snapshot = await getDoc(therapyRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function getTherapiesByPatient(pacienteUid) {
  const therapiesRef = collection(db, THERAPIES_COLLECTION);
  const therapiesQuery = query(
    therapiesRef,
    where("pacienteUid", "==", pacienteUid)
  );

  const snapshot = await getDocs(therapiesQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}
