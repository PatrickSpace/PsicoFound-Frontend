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
const ACTIVE_THERAPY_STATUS = "activo";

export async function createTherapy(data = {}) {
  if (data.pacienteUid) {
    const activeTherapy = await getActiveTherapyByPatient(data.pacienteUid);

    if (activeTherapy) {
      throw new Error(
        "Ya tienes una terapia activa. Debes pausarla o cancelarla antes de crear una nueva."
      );
    }
  }

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
  if (!pacienteUid) {
    return [];
  }

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

export async function getActiveTherapyByPatient(pacienteUid) {
  const therapies = await getTherapiesByPatient(pacienteUid);

  return (
    therapies.find(
      (therapy) =>
        (therapy.estado || "").toString().trim().toLowerCase() ===
        ACTIVE_THERAPY_STATUS
    ) || null
  );
}

export async function getTherapyByIdForPatient(terapiaId, pacienteUid) {
  if (!terapiaId || !pacienteUid) {
    return null;
  }

  const therapy = await getTherapyById(terapiaId);

  if (!therapy || therapy.pacienteUid !== pacienteUid) {
    return null;
  }

  return therapy;
}

export async function updateTherapyStatus(terapiaId, estado) {
  if (!terapiaId || !estado) {
    throw new Error("Missing terapiaId or estado");
  }

  const currentTherapy = await getTherapyById(terapiaId);

  if (!currentTherapy) {
    throw new Error("No se encontro la terapia a actualizar.");
  }

  const normalizedStatus = estado.toString().trim().toLowerCase();

  if (normalizedStatus === ACTIVE_THERAPY_STATUS) {
    const activeTherapy = await getActiveTherapyByPatient(currentTherapy.pacienteUid);

    if (activeTherapy && activeTherapy.id !== terapiaId) {
      throw new Error(
        "Ya tienes otra terapia activa. Debes pausarla o cancelarla antes de reactivar esta."
      );
    }
  }

  const therapyRef = doc(db, THERAPIES_COLLECTION, terapiaId);

  await updateDoc(therapyRef, {
    estado,
    updatedAt: serverTimestamp(),
  });
}
