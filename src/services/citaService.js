import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import {
  appendAppointmentToTherapy,
  createTherapy,
  getTherapyById,
  replaceTherapyAppointments,
} from "@/services/terapiaService";

const APPOINTMENTS_COLLECTION = "citas";

export async function createAppointment(data = {}) {
  const therapy = data.terapiaId
    ? { id: data.terapiaId }
    : await createTherapy({
        usuarioId: data.usuarioId || data.pacienteUid,
        pacienteUid: data.pacienteUid,
        pacienteNombre: data.pacienteNombre,
        pacienteEmail: data.pacienteEmail,
        terapeutaId: data.terapeutaId,
        terapeutaNombre: data.terapeutaNombre,
        modalidad: data.modalidad,
        estado: "activo",
      });

  if (therapy.id) {
    const currentTherapy = await getTherapyById(therapy.id);
    const hasOpenAppointment = (Array.isArray(currentTherapy?.citas) ? currentTherapy.citas : []).some(
      (cita) => {
        const status = (cita?.estado || "").toString().trim().toLowerCase();
        return status === "pendiente" || status === "confirmada";
      }
    );

    if (hasOpenAppointment) {
      throw new Error("Ya existe una cita pendiente o confirmada para esta terapia");
    }
  }

  const payload = {
    terapiaId: therapy.id,
    terapeutaId: data.terapeutaId || "",
    terapeutaNombre: data.terapeutaNombre || "",
    pacienteUid: data.pacienteUid || "demo-user",
    pacienteNombre: data.pacienteNombre || "Usuario demo",
    pacienteEmail: data.pacienteEmail || "",
    fecha: data.fecha || "",
    hora: data.hora || "",
    notas: data.notas || "",
    modalidad: data.modalidad || "",
    ubicacion: data.ubicacion || "",
    estado: data.estado || "pendiente",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, APPOINTMENTS_COLLECTION), payload);

  await appendAppointmentToTherapy(therapy.id, {
    citaId: docRef.id,
    terapiaId: therapy.id,
    usuarioId: payload.pacienteUid,
    terapeutaId: payload.terapeutaId,
    fecha: payload.fecha,
    hora: payload.hora,
    estado: payload.estado,
    notas: payload.notas,
    modalidad: payload.modalidad,
    ubicacion: payload.ubicacion,
  });

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function confirmAppointment({ citaId, terapiaId }) {
  const therapy = await getTherapyById(terapiaId);
  const hasAnotherConfirmedAppointment = (Array.isArray(therapy?.citas) ? therapy.citas : []).some(
    (cita) =>
      cita.citaId !== citaId &&
      (cita.estado || "").toString().trim().toLowerCase() === "confirmada"
  );

  if (hasAnotherConfirmedAppointment) {
    throw new Error("Ya existe otra cita confirmada para esta terapia");
  }

  await updateAppointmentStatus({ citaId, terapiaId, estado: "confirmada" });
}

export async function markAppointmentAsCompleted({ citaId, terapiaId }) {
  await updateAppointmentStatus({ citaId, terapiaId, estado: "realizada" });
}

export async function resetAppointmentToPending({ citaId, terapiaId }) {
  await updateAppointmentStatus({ citaId, terapiaId, estado: "pendiente" });
}

export async function updateAppointment({
  citaId,
  terapiaId,
  fecha,
  hora,
  notas,
  modalidad,
  ubicacion,
}) {
  if (!citaId || !terapiaId) {
    throw new Error("Missing citaId or terapiaId");
  }

  const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, citaId);
  await updateDoc(appointmentRef, {
    fecha,
    hora,
    notas: notas || "",
    modalidad: modalidad || "",
    ubicacion: ubicacion || "",
    estado: "pendiente",
  });

  const therapy = await getTherapyById(terapiaId);
  const citasActualizadas = (Array.isArray(therapy?.citas) ? therapy.citas : []).map((cita) =>
    cita.citaId === citaId
      ? {
          ...cita,
          fecha,
          hora,
          notas: notas || "",
          modalidad: modalidad || "",
          ubicacion: ubicacion || "",
          estado: "pendiente",
        }
      : cita
  );

  await replaceTherapyAppointments(terapiaId, citasActualizadas);
}

async function updateAppointmentStatus({ citaId, terapiaId, estado }) {
  if (!citaId || !terapiaId) {
    throw new Error("Missing citaId or terapiaId");
  }

  const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, citaId);
  await updateDoc(appointmentRef, {
    estado,
  });

  const therapy = await getTherapyById(terapiaId);
  const citasActualizadas = (Array.isArray(therapy?.citas) ? therapy.citas : []).map((cita) =>
    cita.citaId === citaId
      ? {
          ...cita,
          estado,
        }
      : cita
  );

  await replaceTherapyAppointments(terapiaId, citasActualizadas);
}
