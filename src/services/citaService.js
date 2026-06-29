import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";
import {
  appendAppointmentToTherapy,
  createTherapy,
  getActiveTherapyByPatient,
  getTherapyById,
  replaceTherapyAppointments,
} from "@/services/terapiaService";
import { appendLongitudinalEvent } from "@/services/longitudinalHistoryService";

const APPOINTMENTS_COLLECTION = "citas";

export async function createAppointment(data = {}) {
  if (!data.terapiaId && data.pacienteUid) {
    const activeTherapy = await getActiveTherapyByPatient(data.pacienteUid);

    if (activeTherapy) {
      throw new Error(
        "Ya tienes una terapia activa. Debes pausarla o cancelarla antes de crear una nueva."
      );
    }
  }

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
    meetingProvider: data.meetingProvider || "",
    meetingUrl: data.meetingUrl || "",
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
    meetingProvider: payload.meetingProvider,
    meetingUrl: payload.meetingUrl,
  });

  await safelyAppendAppointmentEvent({
    eventType: "appointment_created",
    title: "Cita agendada",
    summary: `Se agendó una cita con ${payload.terapeutaNombre || "el terapeuta"} para el ${payload.fecha || "fecha pendiente"}${payload.hora ? ` a las ${payload.hora}` : ""}.`,
    appointment: {
      ...payload,
      citaId: docRef.id,
      terapiaId: therapy.id,
    },
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

  await updateAppointmentStatus({
    citaId,
    terapiaId,
    estado: "confirmada",
    eventType: "appointment_confirmed",
    eventTitle: "Cita confirmada",
    eventSummary: "La cita fue confirmada.",
  });
}

export async function markAppointmentAsCompleted({
  citaId,
  terapiaId,
  sessionSummary = "",
}) {
  await updateAppointmentStatus({
    citaId,
    terapiaId,
    estado: "realizada",
    eventType: "appointment_completed",
    eventTitle: "Sesión realizada",
    eventSummary: sessionSummary
      ? "La sesión fue marcada como realizada con resumen compartido."
      : "La sesión fue marcada como realizada.",
    extraFields: {
      sessionSummary,
      completedAt: serverTimestamp(),
    },
    extraNestedFields: {
      sessionSummary,
      completedAt: new Date().toISOString(),
    },
  });
}

export async function resetAppointmentToPending({ citaId, terapiaId }) {
  await updateAppointmentStatus({
    citaId,
    terapiaId,
    estado: "pendiente",
    eventType: "appointment_pending",
    eventTitle: "Cita pendiente",
    eventSummary: "La cita volvió al estado pendiente.",
  });
}

export async function updateAppointment({
  citaId,
  terapiaId,
  fecha,
  hora,
  notas,
  modalidad,
  ubicacion,
  meetingProvider,
  meetingUrl,
}) {
  if (!citaId || !terapiaId) {
    throw new Error("Missing citaId or terapiaId");
  }

  const therapy = await getTherapyById(terapiaId);
  const currentAppointment = (Array.isArray(therapy?.citas) ? therapy.citas : []).find(
    (cita) => cita.citaId === citaId
  );
  const dateOrTimeChanged =
    currentAppointment?.fecha !== fecha || currentAppointment?.hora !== hora;
  const nextStatus = dateOrTimeChanged
    ? "pendiente"
    : currentAppointment?.estado || "pendiente";

  const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, citaId);
  await updateDoc(appointmentRef, {
    fecha,
    hora,
    notas: notas || "",
    modalidad: modalidad || "",
    ubicacion: ubicacion || "",
    meetingProvider: meetingProvider || "",
    meetingUrl: meetingUrl || "",
    meetingUrlUpdatedAt: meetingUrl ? serverTimestamp() : null,
    estado: nextStatus,
  });

  const citasActualizadas = (Array.isArray(therapy?.citas) ? therapy.citas : []).map((cita) =>
    cita.citaId === citaId
      ? {
          ...cita,
          fecha,
          hora,
          notas: notas || "",
          modalidad: modalidad || "",
          ubicacion: ubicacion || "",
          meetingProvider: meetingProvider || "",
          meetingUrl: meetingUrl || "",
          meetingUrlUpdatedAt: meetingUrl ? new Date().toISOString() : "",
          estado: nextStatus,
        }
      : cita
  );

  await replaceTherapyAppointments(terapiaId, citasActualizadas);

  await safelyAppendAppointmentEvent({
    eventType: dateOrTimeChanged
      ? "appointment_rescheduled"
      : meetingUrl !== currentAppointment?.meetingUrl
        ? "appointment_meeting_link_updated"
        : "appointment_updated",
    title: dateOrTimeChanged
      ? "Cita reprogramada"
      : meetingUrl !== currentAppointment?.meetingUrl
        ? "Enlace de sesión actualizado"
        : "Cita actualizada",
    summary: dateOrTimeChanged
      ? `La cita fue reprogramada para el ${fecha || "fecha pendiente"}${hora ? ` a las ${hora}` : ""}.`
      : meetingUrl !== currentAppointment?.meetingUrl
        ? "Se actualizó el enlace externo de la sesión."
        : "Se actualizaron los datos de la cita.",
    appointment: {
      ...currentAppointment,
      citaId,
      terapiaId,
      fecha,
      hora,
      notas: notas || "",
      modalidad: modalidad || "",
      ubicacion: ubicacion || "",
      meetingProvider: meetingProvider || "",
      meetingUrl: meetingUrl || "",
      estado: nextStatus,
      pacienteUid: therapy?.pacienteUid,
      terapeutaNombre: therapy?.terapeutaNombre,
    },
  });
}

async function updateAppointmentStatus({
  citaId,
  terapiaId,
  estado,
  eventType,
  eventTitle,
  eventSummary,
  extraFields = {},
  extraNestedFields = {},
}) {
  if (!citaId || !terapiaId) {
    throw new Error("Missing citaId or terapiaId");
  }

  const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, citaId);
  await updateDoc(appointmentRef, {
    estado,
    ...extraFields,
  });

  const therapy = await getTherapyById(terapiaId);
  const currentAppointment = (Array.isArray(therapy?.citas) ? therapy.citas : []).find(
    (cita) => cita.citaId === citaId
  );
  const citasActualizadas = (Array.isArray(therapy?.citas) ? therapy.citas : []).map((cita) =>
    cita.citaId === citaId
      ? {
          ...cita,
          estado,
          ...extraNestedFields,
        }
      : cita
  );

  await replaceTherapyAppointments(terapiaId, citasActualizadas);

  await safelyAppendAppointmentEvent({
    eventType,
    title: eventTitle,
    summary: eventSummary,
    appointment: {
      ...currentAppointment,
      citaId,
      terapiaId,
      estado,
      ...extraNestedFields,
      pacienteUid: therapy?.pacienteUid,
      terapeutaNombre: therapy?.terapeutaNombre,
    },
  });
}

async function safelyAppendAppointmentEvent({
  eventType,
  title,
  summary,
  appointment,
}) {
  if (!appointment?.pacienteUid || !eventType) {
    return;
  }

  try {
    await appendLongitudinalEvent({
      pacienteUid: appointment.pacienteUid,
      eventType,
      sourceType: "appointment",
      sourceId: appointment.citaId || "",
      terapiaId: appointment.terapiaId || "",
      title,
      summary,
      createdBy: auth.currentUser?.uid || appointment.pacienteUid,
      metadata: {
        citaId: appointment.citaId || "",
        terapiaId: appointment.terapiaId || "",
        terapeutaId: appointment.terapeutaId || "",
        terapeutaNombre: appointment.terapeutaNombre || "",
        fecha: appointment.fecha || "",
        hora: appointment.hora || "",
        estado: appointment.estado || "",
        modalidad: appointment.modalidad || "",
        meetingProvider: appointment.meetingProvider || "",
        hasMeetingUrl: Boolean(appointment.meetingUrl),
        hasSessionSummary: Boolean(appointment.sessionSummary),
      },
    });
  } catch (error) {
    console.warn("Could not append longitudinal appointment event:", error);
  }
}
