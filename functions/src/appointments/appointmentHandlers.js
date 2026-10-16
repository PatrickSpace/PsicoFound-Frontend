/* eslint-disable max-len */
const firestoreAdmin = require("firebase-admin/firestore");
const {FieldValue, Timestamp} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {
  assertFutureSlot,
  assertTransition,
  isOpenAppointment,
  normalizeStatus,
  replaceAppointmentSummary,
  zonedDateTimeToDate,
} = require("./appointmentDomain");
const {requirePatientAccess, requirePatientRole} = require("../accounts/accessPolicy");
const {assertCommercialChange, fingerprint} = require("../payments/commercialPolicy");
const {attendanceChange, attendanceSnapshot} = require("./attendancePolicy");
const {quoteFromRate} = require("../payments/paymentOperationHandlers");

const COLLECTIONS = Object.freeze({
  appointments: "citas",
  therapies: "terapias",
  slots: "therapist_availability",
  operations: "appointment_operations",
});
const {DEFAULT_TIME_ZONE, wallParts, resolveSchedule} = require("./schedulePolicy.mjs");

function assertAgendaZone(data) {
  if (data.timeZone && data.timeZone !== DEFAULT_TIME_ZONE) {
    throw new HttpsError("invalid-argument", "La agenda opera exclusivamente en hora de Lima (America/Lima).");
  }
}

function requireAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  return request.auth;
}

function cleanId(value, label = "identificador") {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > 160 || result.includes("/")) {
    throw new HttpsError("invalid-argument", `El ${label} no es válido.`);
  }
  return result;
}

function cleanText(value, max = 1200) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > max) throw new HttpsError("invalid-argument", "El texto es demasiado largo.");
  return result;
}

function cleanMode(value) {
  if (!["patient", "psychologist", "admin"].includes(value)) {
    throw new HttpsError("invalid-argument", "Selecciona una vista válida.");
  }
  return value;
}

function operationRef(db, uid, requestId) {
  const key = cleanId(requestId, "identificador de reintento");
  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    throw new HttpsError("invalid-argument", "El identificador de reintento no es válido.");
  }
  return db.collection(COLLECTIONS.operations).doc(`${uid}_${key}`);
}

function normalizedRoles(user = {}) {
  return [...(Array.isArray(user.roles) ? user.roles : []), user.rol, user.role]
      .filter(Boolean)
      .map((role) => role.toString().trim().toLowerCase());
}

function hasPsychologistRole(user) {
  return normalizedRoles(user).some((role) =>
    ["psychologist", "psicologo", "psicólogo", "psicóloga"].includes(role));
}

async function authorizeTherapyActor(transaction, db, auth, therapy, requestedMode) {
  const mode = cleanMode(requestedMode);
  const user = (await transaction.get(db.doc(`users/${auth.uid}`))).data() || {};
  if (mode === "admin") {
    throw new HttpsError("permission-denied", "La administración operativa no habilita intervenciones terapéuticas.");
  }
  if (mode === "patient") {
    requirePatientRole(user);
    if (therapy.pacienteUid !== auth.uid) {
      throw new HttpsError("permission-denied", "Esta terapia no te pertenece.");
    }
    return {mode, user};
  }
  const therapistId = cleanId(therapy.terapeutaId, "profesional");
  const therapist = (await transaction.get(db.doc(`therapists/${therapistId}`))).data();
  if (!therapist || therapist.activo === false || therapist.uid !== auth.uid || !hasPsychologistRole(user)) {
    throw new HttpsError("permission-denied", "No estás vinculado como profesional a esta terapia.");
  }
  return {mode, user, therapist};
}

function appointmentSummary(appointment) {
  const schedule = resolveSchedule(appointment);
  return {
    citaId: appointment.id,
    terapiaId: appointment.terapiaId,
    usuarioId: appointment.pacienteUid,
    terapeutaId: appointment.terapeutaId,
    fecha: schedule.date || "",
    hora: schedule.time || "",
    timeZone: DEFAULT_TIME_ZONE,
    startAtIso: schedule.start ? schedule.start.toISOString() : null,
    scheduleStatus: schedule.status,
    estado: appointment.estado,
    notas: appointment.notas || "",
    modalidad: appointment.modalidad || "",
    ubicacion: appointment.ubicacion || "",
    meetingProvider: appointment.meetingProvider || "",
    meetingUrl: appointment.meetingUrl || "",
    availabilitySlotId: appointment.availabilitySlotId || "",
    sessionSummary: appointment.sessionSummary || "",
    attendedAt: appointment.attendedAt || null,
    completedAt: appointment.completedAt || null,
    completedBy: appointment.completedBy || "",
    attendanceUpdatedAt: appointment.attendanceUpdatedAt || null,
    cancellationReason: appointment.cancellationReason || "",
    cancellationActorMode: appointment.cancellationActorMode || "",
    rescheduleRequested: appointment.rescheduleRequested === true,
    paymentOperationId: appointment.paymentOperationId || "",
    paymentStatus: appointment.paymentStatus || "",
    paymentSnapshot: appointment.paymentSnapshot || null,
    version: appointment.version || 1,
  };
}

function setEventAndNotification(transaction, db, options) {
  const {appointment, actorUid, recipientUid, type, title, requestId} = options;
  let {message} = options;
  const schedule = resolveSchedule(appointment);
  message = `${title} · ${schedule.label}${message ? ` · ${message}` : ""}`;
  const now = FieldValue.serverTimestamp();
  const suffix = cleanId(requestId, "identificador de operación");
  transaction.set(db.doc(`longitudinal_history/${appointment.id}_${type}_${suffix}`), {
    pacienteUid: appointment.pacienteUid,
    terapeutaId: appointment.terapeutaId,
    terapeutaNombre: appointment.terapeutaNombre || "",
    terapiaId: appointment.terapiaId,
    sourceId: appointment.id,
    sourceType: "appointment",
    eventType: type,
    title,
    summary: message,
    visibility: "patient",
    createdBy: actorUid,
    occurredAt: new Date().toISOString(),
    metadata: {
      citaId: appointment.id,
      status: appointment.estado,
      fecha: schedule.date || null,
      hora: schedule.time || null,
      timeZone: DEFAULT_TIME_ZONE,
      startAtIso: schedule.start ? schedule.start.toISOString() : null,
      ...(options.attendanceChange ? {attendanceChange: options.attendanceChange} : {}),
    },
    createdAt: now,
  });
  if (recipientUid) {
    transaction.set(db.doc(`notifications/${appointment.id}_${type}_${suffix}`), {
      recipientUid,
      actorUid,
      type,
      title,
      message,
      route: "/sesiones",
      readAt: null,
      dedupeKey: `${appointment.id}:${type}:${appointment.version || 1}`,
      metadata: {
        scheduleLabel: schedule.label,
        startAtIso: schedule.start ? schedule.start.toISOString() : null,
        citaId: appointment.id,
        terapiaId: appointment.terapiaId,
        terapeutaId: appointment.terapeutaId,
        appointmentStatus: appointment.estado,
        hasMeetingUrl: Boolean(appointment.meetingUrl),
        ...(options.attendanceChange ? {attendanceAction: options.attendanceChange.action, attendanceReason: options.attendanceChange.reason} : {}),
        ...(type === "appointment_rejected" ? {
          cancellationReason: appointment.cancellationReason,
          rescheduleRequested: true,
        } : {}),
      },
      createdAt: now,
    });
  }
}

function readSlotSchedule(slot) {
  const {start, timeZone} = assertFutureSlot(slot);
  const lima = wallParts(start);
  return {
    fecha: lima.date,
    hora: lima.time,
    timeZone,
    startAt: Timestamp.fromDate(start),
    startAtIso: start.toISOString(),
    modalidad: cleanText(slot.modality || "", 80),
    ubicacion: cleanText(slot.location || "", 300),
  };
}

function readManualSchedule(data) {
  assertAgendaZone(data);
  const fecha = cleanText(data.fecha || "", 10);
  const hora = cleanText(data.hora || "", 5);
  const timeZone = cleanText(data.timeZone || DEFAULT_TIME_ZONE, 80);
  const start = zonedDateTimeToDate(fecha, hora, timeZone);
  if (!start || start.getTime() <= Date.now()) {
    throw new HttpsError("failed-precondition", "La cita debe programarse en un horario futuro válido.");
  }
  return {
    fecha,
    hora,
    timeZone,
    startAt: Timestamp.fromDate(start),
    startAtIso: start.toISOString(),
    modalidad: cleanText(data.modalidad || "", 80),
    ubicacion: cleanText(data.ubicacion || "", 300),
  };
}

function mapDomainError(error) {
  if (error instanceof HttpsError) return error;
  const code = ["permission-denied", "failed-precondition", "invalid-argument"].includes(error.code) ?
    error.code : "internal";
  return new HttpsError(code, code === "internal" ? "No pudimos completar la operación." : error.message);
}

async function therapistRecipient(transaction, db, therapistId) {
  const therapist = (await transaction.get(db.doc(`therapists/${cleanId(therapistId, "profesional")}`))).data();
  return therapist && therapist.uid || "";
}

async function reserveAppointment(request) {
  assertAgendaZone(request.data || {});
  const auth = requireAuth(request);
  const data = request.data || {};
  const mode = cleanMode(data.mode || "patient");
  if (mode === "patient") await requirePatientAccess(request);
  const db = firestoreAdmin.getFirestore();
  const opRef = operationRef(db, auth.uid, data.requestId);
  const appointmentRef = db.collection(COLLECTIONS.appointments).doc();
  const requestedTherapyId = cleanText(data.terapiaId || "", 160);
  const therapistId = cleanId(data.terapeutaId, "profesional");
  const slotId = cleanText(data.availabilitySlotId || "", 160);

  try {
    return await db.runTransaction(async (transaction) => {
      const operation = await transaction.get(opRef);
      if (operation.exists) {
        if (operation.data().fingerprint !== fingerprint({action: "reserveAppointment", data})) {
          throw new HttpsError("already-exists", "El identificador de reintento corresponde a otra operación.");
        }
        return operation.data().result;
      }

      let therapySnapshot = requestedTherapyId ?
        await transaction.get(db.doc(`${COLLECTIONS.therapies}/${cleanId(requestedTherapyId, "terapia")}`)) : null;
      let therapy = therapySnapshot && therapySnapshot.data();
      if (!therapy && mode !== "patient") {
        throw new HttpsError("failed-precondition", "Selecciona una terapia existente.");
      }
      if (!therapy) {
        const activeSnapshot = await transaction.get(db.collection(COLLECTIONS.therapies)
            .where("pacienteUid", "==", auth.uid).where("estado", "==", "activo").limit(2));
        if (activeSnapshot.size > 1) {
          throw new HttpsError("failed-precondition", "Hay más de una terapia activa; solicita soporte antes de reservar.");
        }
        therapySnapshot = activeSnapshot.empty ? null : activeSnapshot.docs[0];
        therapy = therapySnapshot && therapySnapshot.data();
      }

      let actor;
      if (therapy) {
        actor = await authorizeTherapyActor(transaction, db, auth, therapy, mode);
        if ((therapy.estado || "").toLowerCase() !== "activo") {
          throw new HttpsError("failed-precondition", "La terapia no está activa.");
        }
        if (therapy.terapeutaId !== therapistId) {
          throw new HttpsError("failed-precondition", "El profesional no corresponde a la terapia.");
        }
        if ((therapy.citas || []).some((item) => isOpenAppointment(item.estado))) {
          throw new HttpsError("already-exists", "Ya existe una cita pendiente o confirmada para esta terapia.");
        }
      } else {
        actor = {mode: "patient", user: (await transaction.get(db.doc(`users/${auth.uid}`))).data() || {}};
      }

      const therapistSnapshot = await transaction.get(db.doc(`therapists/${therapistId}`));
      const therapist = therapistSnapshot.data();
      if (!therapist || therapist.activo === false) {
        throw new HttpsError("failed-precondition", "El profesional no está disponible para nuevas citas.");
      }

      let paymentQuote = null;
      if (mode === "patient") {
        if (!therapist.paymentRateId) {
          throw new HttpsError("failed-precondition", "El profesional no tiene una tarifa activa.");
        }
        const rateId = cleanId(therapist.paymentRateId, "tarifa");
        const rate = (await transaction.get(db.doc(`payment_rates/${rateId}`))).data();
        if (!rate || rate.active !== true) {
          throw new HttpsError("failed-precondition", "La tarifa ya no está disponible. Solicita otra cotización.");
        }
        paymentQuote = quoteFromRate(therapistId, therapist, rateId, rate);
        if (cleanId(data.quoteId, "cotización") !== paymentQuote.quoteId) {
          throw new HttpsError("aborted", "La tarifa cambió. Revisa la nueva cotización antes de reservar.");
        }
      }

      let slotSnapshot = null;
      let schedule;
      if (slotId) {
        slotSnapshot = await transaction.get(db.doc(`${COLLECTIONS.slots}/${cleanId(slotId, "horario")}`));
        const slot = slotSnapshot.data();
        if (!slot || slot.status !== "available" || slot.therapistId !== therapistId) {
          throw new HttpsError("aborted", "El horario ya no está disponible. Elige otro bloque.");
        }
        schedule = readSlotSchedule(slot);
      } else {
        if (mode === "patient") throw new HttpsError("failed-precondition", "Selecciona un bloque disponible.");
        schedule = readManualSchedule(data);
      }

      const therapyRef = therapySnapshot ? therapySnapshot.ref : db.collection(COLLECTIONS.therapies).doc();
      const patientUid = therapy ? therapy.pacienteUid : auth.uid;
      const patientUser = patientUid === auth.uid ? actor.user :
        (await transaction.get(db.doc(`users/${patientUid}`))).data() || {};
      const now = FieldValue.serverTimestamp();
      const appointment = {
        id: appointmentRef.id,
        terapiaId: therapyRef.id,
        terapeutaId: therapistId,
        terapeutaNombre: cleanText(therapist.nombre || data.terapeutaNombre || "", 160),
        pacienteUid: patientUid,
        pacienteNombre: cleanText(patientUser.nombre || therapy && therapy.pacienteNombre || "", 160),
        pacienteEmail: cleanText(patientUser.email || therapy && therapy.pacienteEmail || "", 240),
        ...schedule,
        notas: cleanText(data.notas || ""),
        meetingProvider: mode === "patient" ? "" : cleanText(data.meetingProvider || "", 80),
        meetingUrl: mode === "patient" ? "" : cleanText(data.meetingUrl || "", 600),
        availabilitySlotId: slotId,
        estado: "pendiente",
        version: 1,
        paymentOperationId: paymentQuote ? appointmentRef.id : "",
        paymentStatus: paymentQuote ? "pending" : "not_applicable",
        paymentSnapshot: paymentQuote ? {
          isTest: paymentQuote.isTest,
          rateId: paymentQuote.rateId,
          rateVersion: paymentQuote.rateVersion,
          selectionVersion: paymentQuote.selectionVersion,
          name: paymentQuote.name,
          amountMinor: paymentQuote.amountMinor,
          currency: paymentQuote.currency,
          platformPercent: paymentQuote.platformPercent,
          psychologistPercent: paymentQuote.psychologistPercent,
          reconciliation: paymentQuote.reconciliation,
          provider: paymentQuote.provider,
          conditions: paymentQuote.conditions,
          commercialPolicy: paymentQuote.commercialPolicy,
        } : null,
      };
      const therapyBase = therapy || {
        usuarioId: patientUid,
        pacienteUid: patientUid,
        pacienteNombre: appointment.pacienteNombre,
        pacienteEmail: appointment.pacienteEmail,
        terapeutaId: therapistId,
        terapeutaNombre: appointment.terapeutaNombre,
        modalidad: appointment.modalidad,
        estado: "activo",
        fechaCreacion: new Date().toISOString(),
        createdAt: now,
      };

      transaction.set(appointmentRef, {...appointment, createdAt: now, updatedAt: now});
      if (paymentQuote) {
        transaction.create(db.doc(`payment_operations/${appointmentRef.id}`), {
          reference: `LUR-${appointmentRef.id.toUpperCase().slice(0, 12)}`,
          appointmentId: appointmentRef.id,
          therapyId: therapyRef.id,
          patientUid,
          therapistId,
          status: "pending",
          amountMinor: paymentQuote.amountMinor,
          currency: paymentQuote.currency,
          paymentUrl: paymentQuote.paymentUrl,
          provider: paymentQuote.provider,
          reconciliation: paymentQuote.reconciliation,
          rateSnapshot: appointment.paymentSnapshot,
          expirationPolicyConfigured: true,
          expiresAt: Timestamp.fromMillis(Math.min(Date.now() + paymentQuote.commercialPolicy.holdMinutes * 60000, schedule.startAt.toMillis())),
          createdAt: now,
          updatedAt: now,
        });
      }
      transaction.set(therapyRef, {
        ...therapyBase,
        citas: replaceAppointmentSummary(therapyBase.citas, appointment.id, appointmentSummary(appointment)),
        updatedAt: now,
      }, {merge: true});
      if (slotSnapshot) {
        transaction.update(slotSnapshot.ref, {
          status: "booked", bookedBy: patientUid, appointmentId: appointment.id, updatedAt: now,
        });
      }
      setEventAndNotification(transaction, db, {
        appointment,
        actorUid: auth.uid,
        recipientUid: mode === "patient" ? therapist.uid : patientUid,
        type: "appointment_created",
        title: "Cita solicitada",
        message: "",
        requestId: data.requestId,
      });
      const result = {appointmentId: appointment.id, therapyId: therapyRef.id, appointment};
      transaction.create(opRef, {fingerprint: fingerprint({action: "reserveAppointment", data}), type: "reserve", actorUid: auth.uid, result, createdAt: now});
      return result;
    });
  } catch (error) {
    throw mapDomainError(error);
  }
}

async function rescheduleAppointment(request) {
  assertAgendaZone(request.data || {});
  const auth = requireAuth(request);
  const data = request.data || {};
  const db = firestoreAdmin.getFirestore();
  const appointmentId = cleanId(data.appointmentId || data.citaId, "cita");
  const opRef = operationRef(db, auth.uid, data.requestId);
  const appointmentRef = db.doc(`${COLLECTIONS.appointments}/${appointmentId}`);
  const nextSlotId = cleanText(data.availabilitySlotId || "", 160);

  try {
    return await db.runTransaction(async (transaction) => {
      const operation = await transaction.get(opRef);
      if (operation.exists) {
        if (operation.data().fingerprint !== fingerprint({action: "rescheduleAppointment", data})) {
          throw new HttpsError("already-exists", "El identificador de reintento corresponde a otra operación.");
        }
        return operation.data().result;
      }
      const current = (await transaction.get(appointmentRef)).data();
      if (!current) throw new HttpsError("not-found", "La cita no existe.");
      if (!isOpenAppointment(current.estado)) {
        throw new HttpsError("failed-precondition", "Solo se puede reprogramar una cita abierta.");
      }
      const therapyRef = db.doc(`${COLLECTIONS.therapies}/${cleanId(current.terapiaId, "terapia")}`);
      const therapy = (await transaction.get(therapyRef)).data();
      if (!therapy) throw new HttpsError("failed-precondition", "La terapia asociada no existe.");
      const actor = await authorizeTherapyActor(transaction, db, auth, therapy, data.mode || "patient");
      assertCommercialChange(current, actor.mode, "reschedule");
      let nextSlotSnapshot = null;
      let schedule;
      if (nextSlotId) {
        nextSlotSnapshot = await transaction.get(db.doc(`${COLLECTIONS.slots}/${cleanId(nextSlotId, "horario")}`));
        const slot = nextSlotSnapshot.data();
        if (!slot || slot.status !== "available" || slot.therapistId !== therapy.terapeutaId) {
          throw new HttpsError("aborted", "El nuevo horario ya no está disponible.");
        }
        schedule = readSlotSchedule(slot);
      } else {
        if (actor.mode === "patient") throw new HttpsError("failed-precondition", "Selecciona un bloque disponible.");
        schedule = readManualSchedule(data);
      }
      const previousSlotSnapshot = current.availabilitySlotId ?
        await transaction.get(db.doc(`${COLLECTIONS.slots}/${cleanId(current.availabilitySlotId, "horario anterior")}`)) : null;
      const paymentRef = current.paymentOperationId ? db.doc(`payment_operations/${cleanId(current.paymentOperationId, "pago")}`) : null;
      const payment = paymentRef ? (await transaction.get(paymentRef)).data() : null;
      if (payment?.status === "pending" && (!payment.expiresAt || payment.expiresAt.toMillis() <= Date.now())) {
        throw new HttpsError("failed-precondition", "El plazo de pago terminó; la reserva requiere revisión antes de reprogramar.");
      }
      const now = FieldValue.serverTimestamp();
      const next = {
        ...current,
        id: appointmentId,
        ...schedule,
        notas: cleanText(data.notas === undefined ? current.notas || "" : data.notas),
        availabilitySlotId: nextSlotId,
        estado: "pendiente",
        version: Number(current.version || 1) + 1,
      };
      if (actor.mode !== "patient") {
        next.meetingProvider = cleanText(data.meetingProvider === undefined ? current.meetingProvider || "" : data.meetingProvider, 80);
        next.meetingUrl = cleanText(data.meetingUrl === undefined ? current.meetingUrl || "" : data.meetingUrl, 600);
      }
      const recipientUid = actor.mode === "patient" ?
        await therapistRecipient(transaction, db, therapy.terapeutaId) :
        current.pacienteUid;
      if (payment?.expiresAt && ["pending", "submitted"].includes(payment.status)) {
        transaction.update(paymentRef, {expiresAt: Timestamp.fromMillis(Math.min(payment.expiresAt.toMillis(), schedule.startAt.toMillis())), updatedAt: now});
      }
      transaction.update(appointmentRef, {
        ...schedule,
        notas: next.notas,
        availabilitySlotId: nextSlotId,
        estado: next.estado,
        meetingProvider: next.meetingProvider || "",
        meetingUrl: next.meetingUrl || "",
        version: next.version,
        updatedAt: now,
      });
      transaction.update(therapyRef, {
        citas: replaceAppointmentSummary(therapy.citas, appointmentId, appointmentSummary(next)),
        updatedAt: now,
      });
      if (nextSlotSnapshot) {
        transaction.update(nextSlotSnapshot.ref, {
          status: "booked", bookedBy: current.pacienteUid, appointmentId, updatedAt: now,
        });
      }
      if (previousSlotSnapshot && previousSlotSnapshot.exists &&
          previousSlotSnapshot.ref.id !== nextSlotId &&
          previousSlotSnapshot.data().appointmentId === appointmentId) {
        transaction.update(previousSlotSnapshot.ref, {
          status: "available", bookedBy: "", appointmentId: "", updatedAt: now,
        });
      }
      setEventAndNotification(transaction, db, {
        appointment: next,
        actorUid: auth.uid,
        recipientUid,
        type: "appointment_rescheduled",
        title: "Cita reprogramada",
        message: "",
        requestId: data.requestId,
      });
      const result = {appointmentId, therapyId: therapyRef.id, appointment: next};
      transaction.create(opRef, {fingerprint: fingerprint({action: "rescheduleAppointment", data}), type: "reschedule", actorUid: auth.uid, result, createdAt: now});
      return result;
    });
  } catch (error) {
    throw mapDomainError(error);
  }
}

async function changeAppointmentStatus(request) {
  const auth = requireAuth(request);
  const data = request.data || {};
  const db = firestoreAdmin.getFirestore();
  const appointmentId = cleanId(data.appointmentId || data.citaId, "cita");
  const opRef = operationRef(db, auth.uid, data.requestId);
  const appointmentRef = db.doc(`${COLLECTIONS.appointments}/${appointmentId}`);
  const requestedStatus = normalizeStatus(data.status || data.estado, "");

  try {
    return await db.runTransaction(async (transaction) => {
      const operation = await transaction.get(opRef);
      if (operation.exists) {
        if (operation.data().fingerprint !== fingerprint({action: "changeAppointmentStatus", data})) {
          throw new HttpsError("already-exists", "El identificador de reintento corresponde a otra operación.");
        }
        return operation.data().result;
      }
      const current = (await transaction.get(appointmentRef)).data();
      if (!current) throw new HttpsError("not-found", "La cita no existe.");
      const therapyRef = db.doc(`${COLLECTIONS.therapies}/${cleanId(current.terapiaId, "terapia")}`);
      const therapy = (await transaction.get(therapyRef)).data();
      if (!therapy) throw new HttpsError("failed-precondition", "La terapia asociada no existe.");
      const actor = await authorizeTherapyActor(transaction, db, auth, therapy, data.mode || "patient");
      if (data.sessionAction || requestedStatus === "realizada" || current.estado === "realizada" && requestedStatus === "confirmada") {
        const serverNow = new Date();
        const attendance = attendanceChange(current, data, {...actor, uid: auth.uid}, serverNow);
        const targetStatus = attendance.action === "undo" ? "confirmada" : "realizada";
        if (requestedStatus !== targetStatus) throw new HttpsError("invalid-argument", "La acción de atención y el estado solicitado no coinciden.");
        if (attendance.action === "undo" && (therapy.citas || []).some((item) => item.citaId !== appointmentId && isOpenAppointment(item.estado))) {
          throw new HttpsError("failed-precondition", "Ya existe otra cita abierta en este proceso. Resuélvela antes de deshacer la realización.");
        }
        const recordedAt = serverNow.toISOString();
        const next = {...current, ...attendance.update, id: appointmentId,
          version: Number(current.version || 1) + 1, attendanceUpdatedAt: recordedAt};
        const eventType = attendance.action === "complete" ? "appointment_completed" : attendance.action === "correct" ? "appointment_attendance_corrected" : "appointment_completion_undone";
        const title = attendance.action === "complete" ? "Sesión realizada" : attendance.action === "correct" ? "Datos de atención corregidos" : "Registro de realización deshecho";
        const revision = {action: attendance.action, before: attendance.before, after: attendanceSnapshot(next),
          reason: attendance.reason, actorUid: auth.uid, recordedAt};
        const update = {...attendance.update, version: next.version, attendanceUpdatedAt: recordedAt, updatedAt: FieldValue.serverTimestamp()};
        if (attendance.action === "complete") update.completedAt = Timestamp.fromDate(serverNow);
        transaction.update(appointmentRef, update);
        transaction.update(therapyRef, {citas: replaceAppointmentSummary(therapy.citas, appointmentId, appointmentSummary(next)), updatedAt: FieldValue.serverTimestamp()});
        setEventAndNotification(transaction, db, {appointment: next, actorUid: auth.uid,
          recipientUid: current.pacienteUid, type: eventType, title, requestId: data.requestId,
          message: attendance.reason, attendanceChange: revision});
        const result = {appointmentId, therapyId: therapyRef.id, appointment: next};
        transaction.create(opRef, {fingerprint: fingerprint({action: "changeAppointmentStatus", data}), type: "attendance", actorUid: auth.uid, result, createdAt: FieldValue.serverTimestamp()});
        return result;
      }
      const professionalRejection = requestedStatus === "cancelada" && actor.mode === "psychologist";
      const cancellationReason = requestedStatus === "cancelada" ? cleanText(data.reason || "", 500) : "";
      if (professionalRejection && data.expectedVersion !== Number(current.version || 1)) {
        throw new HttpsError("aborted", "La cita cambió. Actualiza la agenda y revisa el horario antes de rechazarla.");
      }
      if (professionalRejection && !cancellationReason) {
        throw new HttpsError("invalid-argument", "Indica el motivo y solicita al paciente que elija un nuevo horario.");
      }
      if (requestedStatus === "cancelada") assertCommercialChange(current, actor.mode, "cancel");
      if (current.paymentOperationId && current.estado === "cancelada" && requestedStatus !== "cancelada") {
        throw new HttpsError("failed-precondition", "Una reserva comercial cerrada no se reabre; solicita una nueva reserva.");
      }
      assertTransition(actor.mode, current.estado, requestedStatus);
      const recipientUid = actor.mode === "patient" ?
        await therapistRecipient(transaction, db, therapy.terapeutaId) : current.pacienteUid;
      const previousSlotSnapshot = requestedStatus === "cancelada" && current.availabilitySlotId ?
        await transaction.get(db.doc(`${COLLECTIONS.slots}/${cleanId(current.availabilitySlotId, "horario")}`)) : null;
      const paymentSnapshot = requestedStatus === "cancelada" && current.paymentOperationId ?
        await transaction.get(db.doc(`payment_operations/${cleanId(current.paymentOperationId, "pago")}`)) : null;
      const obligationRef = current.paymentOperationId ? db.doc(`professional_obligations/${current.paymentOperationId}`) : null;
      const obligationSnapshot = requestedStatus === "cancelada" && obligationRef ? await transaction.get(obligationRef) : null;
      const now = FieldValue.serverTimestamp();
      const next = {
        ...current,
        id: appointmentId,
        estado: requestedStatus,
        version: Number(current.version || 1) + 1,

        ...(requestedStatus === "cancelada" ? {
          cancelledAt: new Date().toISOString(),
          cancellationReason,
          cancellationActorMode: actor.mode,
          rescheduleRequested: professionalRejection,
          cancelledBy: auth.uid,
        } : {}),
      };
      const update = {estado: next.estado, version: next.version, updatedAt: now};
      if (requestedStatus === "cancelada") {
        update.cancelledAt = now;
        update.cancelledBy = auth.uid;
        update.cancellationReason = next.cancellationReason;
        update.cancellationActorMode = actor.mode;
        update.rescheduleRequested = professionalRejection;
      }
      if (previousSlotSnapshot && previousSlotSnapshot.exists &&
          previousSlotSnapshot.data().appointmentId === appointmentId) {
        transaction.update(previousSlotSnapshot.ref, {
          status: professionalRejection ? "closed" : "available",
          bookedBy: "", appointmentId: "", updatedAt: now,
          ...(professionalRejection ? {closedBy: auth.uid, closedAt: now} : {}),
        });
      }
      if (paymentSnapshot && paymentSnapshot.exists) {
        const payment = paymentSnapshot.data();
        const paymentStatus = ["confirmed", "refund_review"].includes(payment.status) ?
          "refund_review" :
          ["pending", "submitted"].includes(payment.status) ? "cancelled" : payment.status;
        transaction.update(paymentSnapshot.ref, {
          status: paymentStatus,
          cancellationReviewRequired: payment.status === "confirmed",
          updatedAt: now,
        });
        next.paymentStatus = paymentStatus;
        update.paymentStatus = paymentStatus;
      }
      if (obligationSnapshot?.exists) transaction.update(obligationRef, {status: "refund_review", updatedAt: now});
      transaction.update(appointmentRef, update);
      transaction.update(therapyRef, {
        citas: replaceAppointmentSummary(therapy.citas, appointmentId, appointmentSummary(next)),
        updatedAt: now,
      });
      const type = requestedStatus === "confirmada" ? "appointment_confirmed" :
        requestedStatus === "realizada" ? "appointment_completed" :
        requestedStatus === "cancelada" ? (professionalRejection ? "appointment_rejected" : "appointment_cancelled") : "appointment_pending";
      const titles = {
        appointment_confirmed: "Cita confirmada",
        appointment_completed: "Sesión realizada",
        appointment_cancelled: "Cita cancelada",
        appointment_rejected: "Tu profesional solicita un nuevo horario",
        appointment_pending: "Cita pendiente de confirmación",
      };
      setEventAndNotification(transaction, db, {
        appointment: next,
        actorUid: auth.uid,
        recipientUid,
        type,
        title: titles[type],
        message: professionalRejection ? `${cancellationReason} · No podré atenderte en este horario. Elige un nuevo horario disponible desde Mis sesiones. Si ya pagaste, tu pago requiere revisión; no se devuelve ni se aplica automáticamente a otra reserva.` : next.cancellationReason || "",
        requestId: data.requestId,
      });
      const result = {appointmentId, therapyId: therapyRef.id, appointment: next};
      transaction.create(opRef, {fingerprint: fingerprint({action: "changeAppointmentStatus", data}), type: "status", actorUid: auth.uid, result, createdAt: now});
      return result;
    });
  } catch (error) {
    throw mapDomainError(error);
  }
}

async function updateAppointmentDetails(request) {
  const auth = requireAuth(request);
  const data = request.data || {};
  const db = firestoreAdmin.getFirestore();
  const appointmentId = cleanId(data.appointmentId || data.citaId, "cita");
  const opRef = operationRef(db, auth.uid, data.requestId);
  const appointmentRef = db.doc(`${COLLECTIONS.appointments}/${appointmentId}`);

  try {
    return await db.runTransaction(async (transaction) => {
      const operation = await transaction.get(opRef);
      if (operation.exists) {
        if (operation.data().fingerprint !== fingerprint({action: "updateAppointmentDetails", data})) {
          throw new HttpsError("already-exists", "El identificador de reintento corresponde a otra operación.");
        }
        return operation.data().result;
      }
      const current = (await transaction.get(appointmentRef)).data();
      if (!current) throw new HttpsError("not-found", "La cita no existe.");
      const therapyRef = db.doc(`${COLLECTIONS.therapies}/${cleanId(current.terapiaId, "terapia")}`);
      const therapy = (await transaction.get(therapyRef)).data();
      if (!therapy) throw new HttpsError("failed-precondition", "La terapia asociada no existe.");
      const actor = await authorizeTherapyActor(transaction, db, auth, therapy, data.mode || "patient");
      if (actor.mode === "patient" && !isOpenAppointment(current.estado)) {
        throw new HttpsError("failed-precondition", "La cita ya no admite cambios del paciente.");
      }
      const recipientUid = actor.mode === "patient" ?
        await therapistRecipient(transaction, db, therapy.terapeutaId) : current.pacienteUid;
      const now = FieldValue.serverTimestamp();
      const next = {
        ...current,
        id: appointmentId,
        notas: cleanText(data.notas === undefined ? current.notas || "" : data.notas),
        version: Number(current.version || 1) + 1,
      };
      if (actor.mode !== "patient") {
        const meetingUrl = cleanText(data.meetingUrl === undefined ? current.meetingUrl || "" : data.meetingUrl, 600);
        if (meetingUrl) {
          let url;
          try {
            url = new URL(meetingUrl);
          } catch (error) {
            throw new HttpsError("invalid-argument", "Ingresa un enlace de sesión válido.");
          }
          if (url.protocol !== "https:") {
            throw new HttpsError("invalid-argument", "El enlace de sesión debe usar HTTPS.");
          }
        }
        next.meetingProvider = cleanText(data.meetingProvider === undefined ? current.meetingProvider || "" : data.meetingProvider, 80);
        next.meetingUrl = meetingUrl;
      }
      transaction.update(appointmentRef, {
        notas: next.notas,
        meetingProvider: next.meetingProvider || "",
        meetingUrl: next.meetingUrl || "",
        meetingUrlUpdatedAt: actor.mode === "patient" ? current.meetingUrlUpdatedAt || null : now,
        version: next.version,
        updatedAt: now,
      });
      transaction.update(therapyRef, {
        citas: replaceAppointmentSummary(therapy.citas, appointmentId, appointmentSummary(next)),
        updatedAt: now,
      });
      const meetingChanged = next.meetingUrl !== current.meetingUrl;
      setEventAndNotification(transaction, db, {
        appointment: next,
        actorUid: auth.uid,
        recipientUid,
        type: meetingChanged ? "appointment_meeting_link_updated" : "appointment_updated",
        title: meetingChanged ? "Enlace de sesión actualizado" : "Cita actualizada",
        message: meetingChanged ? "El enlace de la sesión ya está disponible." : "Se actualizaron los datos de la cita.",
        requestId: data.requestId,
      });
      const result = {appointmentId, therapyId: therapyRef.id, appointment: next};
      transaction.create(opRef, {fingerprint: fingerprint({action: "updateAppointmentDetails", data}), type: "details", actorUid: auth.uid, result, createdAt: now});
      return result;
    });
  } catch (error) {
    throw mapDomainError(error);
  }
}

async function changeTherapyStatus(request) {
  const auth = requireAuth(request);
  const data = request.data || {};
  const db = firestoreAdmin.getFirestore();
  const therapyId = cleanId(data.therapyId || data.terapiaId, "terapia");
  const status = cleanText(data.status || data.estado, 20).toLowerCase();
  if (!["activo", "pausado", "cancelado"].includes(status)) {
    throw new HttpsError("invalid-argument", "El estado de terapia no es válido.");
  }
  const opRef = operationRef(db, auth.uid, data.requestId);
  const therapyRef = db.doc(`${COLLECTIONS.therapies}/${therapyId}`);

  return db.runTransaction(async (transaction) => {
    const operation = await transaction.get(opRef);
    if (operation.exists) {
      if (operation.data().fingerprint !== fingerprint({action: "changeTherapyStatus", data})) {
        throw new HttpsError("already-exists", "El identificador de reintento corresponde a otra operación.");
      }
      return operation.data().result;
    }
    const therapy = (await transaction.get(therapyRef)).data();
    if (!therapy) throw new HttpsError("not-found", "La terapia no existe.");
    const actor = await authorizeTherapyActor(transaction, db, auth, therapy, data.mode || "patient");
    if (!["patient", "admin"].includes(actor.mode)) {
      throw new HttpsError("permission-denied", "El profesional no puede cambiar este estado por el paciente.");
    }
    if ((therapy.citas || []).some((item) => isOpenAppointment(item.estado))) {
      throw new HttpsError(
          "failed-precondition",
          "Primero reprograma o cancela la cita abierta. El cambio de terapia no cancela citas silenciosamente.",
      );
    }
    if (status === "activo") {
      const activeSnapshot = await transaction.get(db.collection(COLLECTIONS.therapies)
          .where("pacienteUid", "==", therapy.pacienteUid).where("estado", "==", "activo").limit(2));
      if (activeSnapshot.docs.some((item) => item.id !== therapyId)) {
        throw new HttpsError("already-exists", "Ya existe otra terapia activa.");
      }
    }
    const now = FieldValue.serverTimestamp();
    transaction.update(therapyRef, {estado: status, updatedAt: now});
    transaction.create(db.collection("longitudinal_history").doc(), {
      pacienteUid: therapy.pacienteUid,
      terapeutaId: therapy.terapeutaId,
      terapeutaNombre: therapy.terapeutaNombre || "",
      terapiaId: therapyId,
      sourceId: therapyId,
      sourceType: "therapy",
      eventType: `therapy_${status}`,
      title: status === "activo" ? "Terapia reactivada" : status === "pausado" ? "Terapia pausada" : "Terapia cancelada",
      summary: cleanText(data.reason || "", 500),
      visibility: "patient",
      createdBy: auth.uid,
      occurredAt: new Date().toISOString(),
      createdAt: now,
    });
    const result = {therapyId, status};
    transaction.create(opRef, {fingerprint: fingerprint({action: "changeTherapyStatus", data}), type: "therapy_status", actorUid: auth.uid, result, createdAt: now});
    return result;
  });
}

async function manageAvailability(request) {
  const auth = requireAuth(request);
  const data = request.data || {};
  assertAgendaZone(data);
  const db = firestoreAdmin.getFirestore();
  const therapistId = cleanId(data.therapistId, "profesional");
  const opRef = operationRef(db, auth.uid, data.requestId);
  const therapistRef = db.doc(`therapists/${therapistId}`);
  const slotRef = data.action === "close" ?
    db.doc(`therapist_availability/${cleanId(data.slotId, "bloque")}`) :
    db.collection("therapist_availability").doc();
  return db.runTransaction(async (transaction) => {
    const user = (await transaction.get(db.doc(`users/${auth.uid}`))).data() || {};
    const therapist = (await transaction.get(therapistRef)).data();
    const mode = cleanMode(data.mode);
    if (!therapist || mode !== "psychologist" ||
        !hasPsychologistRole(user) || therapist.uid !== auth.uid) {
      throw new HttpsError("permission-denied", "No puedes gestionar esta disponibilidad.");
    }
    const operation = await transaction.get(opRef);
    if (operation.exists) {
      if (operation.data().fingerprint !== fingerprint({action: "manageAvailability", data})) {
        throw new HttpsError("already-exists", "El identificador de reintento corresponde a otra operación.");
      }
      return operation.data().result;
    }
    const now = FieldValue.serverTimestamp();
    let result;
    if (data.action === "close") {
      const slot = (await transaction.get(slotRef)).data();
      if (!slot || slot.therapistId !== therapistId || slot.status !== "available") {
        throw new HttpsError("failed-precondition", "Solo puedes cerrar un bloque disponible.");
      }
      transaction.update(slotRef, {status: "closed", updatedAt: now});
      result = {id: slotRef.id, status: "closed"};
    } else {
      if (data.action !== "create" || therapist.activo === false) {
        throw new HttpsError("failed-precondition", "El profesional no puede abrir disponibilidad.");
      }
      const schedule = readManualSchedule({fecha: data.date, hora: data.startTime, timeZone: data.timeZone});
      const start = schedule.startAt.toDate();
      const end = new Date(start.getTime() + 60 * 60000);
      const slots = await transaction.get(db.collection("therapist_availability").where("therapistId", "==", therapistId));
      if (slots.docs.some((doc) => {
        const slot = doc.data();
        const existing = resolveSchedule(slot).start;
        return slot.status !== "closed" && existing && existing < end &&
          existing.getTime() + Number(slot.durationMinutes || 60) * 60000 > start.getTime();
      })) throw new HttpsError("already-exists", "Ya existe un bloque que se superpone con ese horario.");
      const endWall = wallParts(end);
      const modality = cleanText(data.modality || "Remoto", 80);
      const location = ["remoto", "remota", "online"].includes(modality.toLowerCase()) ?
        "Terapia Online" : cleanText(data.location || "", 300);
      const slot = {
        therapistId, date: schedule.fecha, startTime: schedule.hora,
        endDate: endWall.date, endTime: endWall.time, durationMinutes: 60,
        timeZone: DEFAULT_TIME_ZONE, startAt: schedule.startAt, startAtIso: schedule.startAtIso,
        modality, location, status: "available",
        createdBy: auth.uid, createdAt: now, updatedAt: now,
      };
      transaction.create(slotRef, slot);
      result = {id: slotRef.id, status: "available", startAtIso: schedule.startAtIso};
    }
    // Serialize concurrent creates (including query phantoms) for this therapist.
    transaction.update(therapistRef, {availabilityVersion: Number(therapist.availabilityVersion || 0) + 1});
    transaction.create(opRef, {fingerprint: fingerprint({action: "manageAvailability", data}), type: "availability", result, actorUid: auth.uid, createdAt: now});
    return result;
  });
}

module.exports = {
  manageAvailability,
  changeAppointmentStatus,
  changeTherapyStatus,
  reserveAppointment,
  rescheduleAppointment,
  updateAppointmentDetails,
};
