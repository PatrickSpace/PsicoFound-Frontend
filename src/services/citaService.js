import {
  addDoc,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
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
import { createNotification } from "@/services/notificationService";
import { getTherapistById } from "@/services/psicologoService";
import { readDocument, trackWrite } from "@/repositories/firestoreRepository";
import { invalidateCachePrefix } from "@/utils/requestCache";

const APPOINTMENTS_COLLECTION = "citas";
const AVAILABILITY_COLLECTION = "therapist_availability";

export async function createAppointment(data = {}) {
  const appointmentData = data.availabilitySlotId
    ? await hydrateAppointmentDataFromSlot(data)
    : data;
  const therapy = await resolveAppointmentTherapy(appointmentData);

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
    terapeutaId: appointmentData.terapeutaId || "",
    terapeutaNombre: appointmentData.terapeutaNombre || "",
    pacienteUid: appointmentData.pacienteUid || "demo-user",
    pacienteNombre: appointmentData.pacienteNombre || "Usuario demo",
    pacienteEmail: appointmentData.pacienteEmail || "",
    fecha: appointmentData.fecha || "",
    hora: appointmentData.hora || "",
    notas: appointmentData.notas || "",
    modalidad: appointmentData.modalidad || "",
    ubicacion: appointmentData.ubicacion || "",
    meetingProvider: appointmentData.meetingProvider || "",
    meetingUrl: appointmentData.meetingUrl || "",
    availabilitySlotId: appointmentData.availabilitySlotId || "",
    estado: appointmentData.estado || "pendiente",
    createdAt: serverTimestamp(),
  };

  const docRef = appointmentData.availabilitySlotId
    ? await createAppointmentFromAvailabilitySlot(payload)
    : await trackWrite({
        resource: APPOINTMENTS_COLLECTION,
        source: "createAppointment",
        operation: "addDoc",
        write: () => addDoc(collection(db, APPOINTMENTS_COLLECTION), payload),
      });

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
    availabilitySlotId: payload.availabilitySlotId,
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

  await safelyNotifyTherapist({
    therapistId: payload.terapeutaId,
    type: "appointment_created",
    title: "Nueva cita solicitada",
    message: `${payload.pacienteNombre || "Un paciente"} agendó una cita para el ${payload.fecha || "fecha pendiente"}${payload.hora ? ` a las ${payload.hora}` : ""}.`,
    appointment: {
      ...payload,
      citaId: docRef.id,
      terapiaId: therapy.id,
    },
  });

  return {
    id: docRef.id,
    terapiaId: therapy.id,
    ...payload,
  };
}

async function resolveAppointmentTherapy(data = {}) {
  if (data.terapiaId) {
    return { id: data.terapiaId };
  }

  if (!data.pacienteUid) {
    throw new Error("Missing pacienteUid");
  }

  const activeTherapy = await getActiveTherapyByPatient(data.pacienteUid);

  if (activeTherapy) {
    const sameTherapist =
      (activeTherapy.terapeutaId || "").toString() ===
      (data.terapeutaId || "").toString();

    if (sameTherapist) {
      return activeTherapy;
    }

    throw new Error(
      "Ya tienes una terapia activa. Debes pausarla o cancelarla antes de iniciar una nueva con otro psicólogo."
    );
  }

  return createTherapy({
    usuarioId: data.usuarioId || data.pacienteUid,
    pacienteUid: data.pacienteUid,
    pacienteNombre: data.pacienteNombre,
    pacienteEmail: data.pacienteEmail,
    terapeutaId: data.terapeutaId,
    terapeutaNombre: data.terapeutaNombre,
    modalidad: data.modalidad,
    estado: "activo",
  });
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
    notificationType: "appointment_confirmed",
    notificationTitle: "Cita confirmada",
    notificationMessage: "Tu psicólogo confirmó la cita.",
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
    notificationType: "appointment_completed",
    notificationTitle: "Sesión realizada",
    notificationMessage: "Tu psicólogo marcó la sesión como realizada.",
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
  availabilitySlotId = "",
}) {
  if (!citaId || !terapiaId) {
    throw new Error("Missing citaId or terapiaId");
  }

  const therapy = await getTherapyById(terapiaId);
  const currentAppointment = (Array.isArray(therapy?.citas) ? therapy.citas : []).find(
    (cita) => cita.citaId === citaId
  );
  const slotChangeRequested =
    availabilitySlotId &&
    availabilitySlotId !== (currentAppointment?.availabilitySlotId || "");
  const nextSchedule = slotChangeRequested
      ? await reserveSlotForExistingAppointment({
        slotId: availabilitySlotId,
        previousSlotId: currentAppointment?.availabilitySlotId || "",
        citaId,
        pacienteUid: therapy?.pacienteUid,
        terapeutaId: therapy?.terapeutaId,
      })
    : {
        fecha,
        hora,
        modalidad,
        ubicacion,
        availabilitySlotId: currentAppointment?.availabilitySlotId || availabilitySlotId || "",
      };
  const dateOrTimeChanged =
    currentAppointment?.fecha !== nextSchedule.fecha ||
    currentAppointment?.hora !== nextSchedule.hora;
  const nextStatus = dateOrTimeChanged
    ? "pendiente"
    : currentAppointment?.estado || "pendiente";
  const meetingLinkChanged = meetingUrl !== currentAppointment?.meetingUrl;

  const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, citaId);
  await trackWrite({
    resource: APPOINTMENTS_COLLECTION,
    source: "updateAppointment",
    operation: "updateDoc",
    write: () => updateDoc(appointmentRef, {
      fecha: nextSchedule.fecha,
      hora: nextSchedule.hora,
      notas: notas || "",
      modalidad: nextSchedule.modalidad || "",
      ubicacion: nextSchedule.ubicacion || "",
      meetingProvider: meetingProvider || "",
      meetingUrl: meetingUrl || "",
      meetingUrlUpdatedAt: meetingUrl ? serverTimestamp() : null,
      availabilitySlotId: nextSchedule.availabilitySlotId || "",
      estado: nextStatus,
    }),
  });

  const citasActualizadas = (Array.isArray(therapy?.citas) ? therapy.citas : []).map((cita) =>
    cita.citaId === citaId
      ? {
          ...cita,
          fecha: nextSchedule.fecha,
          hora: nextSchedule.hora,
          notas: notas || "",
          modalidad: nextSchedule.modalidad || "",
          ubicacion: nextSchedule.ubicacion || "",
          meetingProvider: meetingProvider || "",
          meetingUrl: meetingUrl || "",
          meetingUrlUpdatedAt: meetingUrl ? new Date().toISOString() : "",
          availabilitySlotId: nextSchedule.availabilitySlotId || "",
          estado: nextStatus,
        }
      : cita
  );

  await replaceTherapyAppointments(terapiaId, citasActualizadas);

  await safelyAppendAppointmentEvent({
    eventType: dateOrTimeChanged
      ? "appointment_rescheduled"
      : meetingLinkChanged
        ? "appointment_meeting_link_updated"
        : "appointment_updated",
    title: dateOrTimeChanged
      ? "Cita reprogramada"
      : meetingLinkChanged
        ? "Enlace de sesión actualizado"
        : "Cita actualizada",
    summary: dateOrTimeChanged
      ? `La cita fue reprogramada para el ${nextSchedule.fecha || "fecha pendiente"}${nextSchedule.hora ? ` a las ${nextSchedule.hora}` : ""}.`
      : meetingLinkChanged
        ? "Se actualizó el enlace externo de la sesión."
        : "Se actualizaron los datos de la cita.",
    appointment: {
      ...currentAppointment,
      citaId,
      terapiaId,
      fecha: nextSchedule.fecha,
      hora: nextSchedule.hora,
      notas: notas || "",
      modalidad: nextSchedule.modalidad || "",
      ubicacion: nextSchedule.ubicacion || "",
      meetingProvider: meetingProvider || "",
      meetingUrl: meetingUrl || "",
      estado: nextStatus,
      pacienteUid: therapy?.pacienteUid,
      terapeutaNombre: therapy?.terapeutaNombre,
    },
  });

  await safelyNotifyAppointmentUpdate({
    therapy,
    appointment: {
      ...currentAppointment,
      citaId,
      terapiaId,
      fecha: nextSchedule.fecha,
      hora: nextSchedule.hora,
      modalidad: nextSchedule.modalidad || "",
      meetingUrl: meetingUrl || "",
      estado: nextStatus,
    },
    dateOrTimeChanged,
    meetingLinkChanged,
  });

  return {
    id: citaId,
    citaId,
    terapiaId,
    fecha: nextSchedule.fecha,
    hora: nextSchedule.hora,
    notas: notas || "",
    modalidad: nextSchedule.modalidad || "",
    ubicacion: nextSchedule.ubicacion || "",
    meetingProvider: meetingProvider || "",
    meetingUrl: meetingUrl || "",
    availabilitySlotId: nextSchedule.availabilitySlotId || "",
    estado: nextStatus,
  };
}

async function hydrateAppointmentDataFromSlot(data = {}) {
  const slotRef = doc(db, AVAILABILITY_COLLECTION, data.availabilitySlotId);
  const slotSnapshot = await readDocument(slotRef, {
    resource: AVAILABILITY_COLLECTION,
    source: "hydrateAppointmentDataFromSlot",
  });

  if (!slotSnapshot.exists()) {
    throw new Error("Este horario ya no está disponible.");
  }

  const slot = slotSnapshot.data();

  if ((slot.therapistId || "") !== (data.terapeutaId || "")) {
    throw new Error("El horario no pertenece a este psicólogo.");
  }

  return {
    ...data,
    fecha: slot.date || data.fecha || "",
    hora: slot.startTime || data.hora || "",
    modalidad: slot.modality || data.modalidad || "",
    ubicacion: slot.location || data.ubicacion || "",
  };
}

async function createAppointmentFromAvailabilitySlot(payload) {
  const appointmentRef = doc(collection(db, APPOINTMENTS_COLLECTION));
  const slotRef = doc(db, AVAILABILITY_COLLECTION, payload.availabilitySlotId);

  await trackWrite({
    resource: APPOINTMENTS_COLLECTION,
    source: "createAppointmentFromAvailabilitySlot",
    operation: "runTransaction",
    write: () => runTransaction(db, async (transaction) => {
      const slotSnapshot = await transaction.get(slotRef);

      if (!slotSnapshot.exists()) {
        throw new Error("Este horario ya no está disponible.");
      }

      const slot = slotSnapshot.data();
      const status = (slot.status || "").toString().trim().toLowerCase();

      if (status !== "available") {
        throw new Error("Este horario ya fue reservado. Elige otro bloque.");
      }

      if ((slot.therapistId || "") !== (payload.terapeutaId || "")) {
        throw new Error("El horario no pertenece a este psicólogo.");
      }

      payload.fecha = slot.date || payload.fecha;
      payload.hora = slot.startTime || payload.hora;
      payload.modalidad = slot.modality || payload.modalidad;
      payload.ubicacion = slot.location || payload.ubicacion;

      transaction.set(appointmentRef, payload);
      transaction.update(slotRef, {
        status: "booked",
        bookedBy: payload.pacienteUid,
        appointmentId: appointmentRef.id,
        updatedAt: serverTimestamp(),
      });
    }),
  });
  invalidateCachePrefix("availability:");

  return appointmentRef;
}

async function reserveSlotForExistingAppointment({
  slotId,
  previousSlotId = "",
  citaId,
  pacienteUid,
  terapeutaId,
}) {
  const slotRef = doc(db, AVAILABILITY_COLLECTION, slotId);
  const previousSlotRef =
    previousSlotId && previousSlotId !== slotId
      ? doc(db, AVAILABILITY_COLLECTION, previousSlotId)
      : null;

  const result = await trackWrite({
    resource: AVAILABILITY_COLLECTION,
    source: "reserveSlotForExistingAppointment",
    operation: "runTransaction",
    write: () => runTransaction(db, async (transaction) => {
      const slotSnapshot = await transaction.get(slotRef);
      const previousSlotSnapshot = previousSlotRef
        ? await transaction.get(previousSlotRef)
        : null;

      if (!slotSnapshot.exists()) {
        throw new Error("Este horario ya no está disponible.");
      }

      const slot = slotSnapshot.data();
      const status = (slot.status || "").toString().trim().toLowerCase();

      if (status !== "available") {
        throw new Error("Este horario ya fue reservado. Elige otro bloque.");
      }

      if ((slot.therapistId || "") !== (terapeutaId || "")) {
        throw new Error("El horario no pertenece a este psicólogo.");
      }

      transaction.update(slotRef, {
        status: "booked",
        bookedBy: pacienteUid || "",
        appointmentId: citaId,
        updatedAt: serverTimestamp(),
      });

      if (
        previousSlotRef &&
        previousSlotSnapshot?.exists() &&
        previousSlotSnapshot.data().appointmentId === citaId
      ) {
        transaction.update(previousSlotRef, {
          status: "available",
          bookedBy: "",
          appointmentId: "",
          updatedAt: serverTimestamp(),
        });
      }

      return {
        fecha: slot.date || "",
        hora: slot.startTime || "",
        modalidad: slot.modality || "",
        ubicacion: slot.location || "",
        availabilitySlotId: slotId,
      };
    }),
  });
  invalidateCachePrefix("availability:");
  return result;
}

async function updateAppointmentStatus({
  citaId,
  terapiaId,
  estado,
  eventType,
  eventTitle,
  eventSummary,
  notificationType = "",
  notificationTitle = "",
  notificationMessage = "",
  extraFields = {},
  extraNestedFields = {},
}) {
  if (!citaId || !terapiaId) {
    throw new Error("Missing citaId or terapiaId");
  }

  const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, citaId);
  await trackWrite({
    resource: APPOINTMENTS_COLLECTION,
    source: "updateAppointmentStatus",
    operation: "updateDoc",
    write: () => updateDoc(appointmentRef, {
      estado,
      ...extraFields,
    }),
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

  if (notificationType) {
    await safelyNotifyPatient({
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      appointment: {
        ...currentAppointment,
        citaId,
        terapiaId,
        estado,
        ...extraNestedFields,
        pacienteUid: therapy?.pacienteUid,
        terapeutaId: therapy?.terapeutaId,
      },
    });
  }
}

async function safelyNotifyAppointmentUpdate({
  therapy,
  appointment,
  dateOrTimeChanged,
  meetingLinkChanged,
}) {
  const actorUid = auth.currentUser?.uid || "";

  if (actorUid && actorUid === therapy?.pacienteUid) {
    await safelyNotifyTherapist({
      therapistId: therapy?.terapeutaId,
      type: dateOrTimeChanged ? "appointment_rescheduled" : "appointment_updated",
      title: dateOrTimeChanged ? "Cita reprogramada" : "Cita actualizada",
      message: `${therapy?.pacienteNombre || "Un paciente"} actualizó una cita.`,
      appointment,
    });
    return;
  }

  if (dateOrTimeChanged) {
    await safelyNotifyPatient({
      type: "appointment_rescheduled",
      title: "Cita reprogramada",
      message: `Tu cita fue reprogramada para el ${appointment.fecha || "fecha pendiente"}${appointment.hora ? ` a las ${appointment.hora}` : ""}.`,
      appointment: {
        ...appointment,
        pacienteUid: therapy?.pacienteUid,
        terapeutaId: therapy?.terapeutaId,
      },
    });
    return;
  }

  if (meetingLinkChanged && appointment.meetingUrl) {
    await safelyNotifyPatient({
      type: "appointment_meeting_link_updated",
      title: "Enlace de sesión disponible",
      message: "Tu psicólogo agregó o actualizó el enlace externo de la sesión.",
      appointment: {
        ...appointment,
        pacienteUid: therapy?.pacienteUid,
        terapeutaId: therapy?.terapeutaId,
      },
    });
  }
}

async function safelyNotifyPatient({ type, title, message, appointment }) {
  try {
    await createNotification({
      recipientUid: appointment?.pacienteUid,
      type,
      title,
      message,
      route: "/sesiones",
      metadata: {
        citaId: appointment?.citaId,
        terapiaId: appointment?.terapiaId,
        terapeutaId: appointment?.terapeutaId,
        appointmentStatus: appointment?.estado,
        hasMeetingUrl: Boolean(appointment?.meetingUrl),
      },
    });
  } catch (error) {
    console.warn("Could not create patient notification:", error);
  }
}

async function safelyNotifyTherapist({ therapistId, type, title, message, appointment }) {
  try {
    const therapist = await getTherapistById(therapistId);

    await createNotification({
      recipientUid: therapist?.uid,
      type,
      title,
      message,
      route: "/psicologo/sesiones",
      metadata: {
        citaId: appointment?.citaId,
        terapiaId: appointment?.terapiaId,
        terapeutaId: therapistId,
        appointmentStatus: appointment?.estado,
        hasMeetingUrl: Boolean(appointment?.meetingUrl),
      },
    });
  } catch (error) {
    console.warn("Could not create therapist notification:", error);
  }
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
