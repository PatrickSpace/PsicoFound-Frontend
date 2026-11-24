const crypto = require("node:crypto");
const admin = require("firebase-admin");
const {HttpsError} = require("firebase-functions/v2/https");
const calendar = require("./calendar");
const {checkSlotConflicts} = require("./bookingConflicts");
const {evaluateCancellationPolicy} = require("../payments/domain/cancellationPolicy");

const {FieldValue, Timestamp} = admin.firestore;
const text = (value, max = 240) => String(value || "").trim().slice(0, max);
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const active = (a) => ["pendiente", "confirmada"].includes(a.estado);

function reminderFields(startsAt, version = 1) {
  return {scheduleVersion: version,
    nextReminderAt: Timestamp.fromMillis(startsAt - 24 * 60 * calendar.MINUTE),
    reminderStages: []};
}

function writeAppointmentEvent(db, tx, id, appointment, actorUid, event, message) {
  const now = FieldValue.serverTimestamp();
  const eventId = hash(`${id}:${event}:${appointment.revision || 0}`);
  tx.set(db.collection("appointment_events").doc(eventId), {
    appointmentId: id, pacienteUid: appointment.pacienteUid,
    terapeutaId: appointment.terapeutaId, actorUid, event,
    fecha: appointment.fecha, hora: appointment.hora,
    estado: appointment.estado, revision: appointment.revision || 0,
    createdAt: now,
  });
  tx.set(db.collection("longitudinal_history").doc(`appointment-${eventId}`), {
    pacienteUid: appointment.pacienteUid, terapiaId: appointment.terapiaId,
    sourceType: "appointment", sourceId: id, eventType: event,
    title: "Actualización de cita", summary: message,
    metadata: {citaId: id, estado: appointment.estado},
    visibility: "shared", createdBy: actorUid,
    occurredAt: now, createdAt: now,
  });
  [appointment.pacienteUid, appointment.psychologistUid].filter(Boolean)
      .forEach((uid) => {
        tx.set(db.collection("notifications").doc(`${eventId}-${uid}`), {
          recipientUid: uid, actorUid, type: event,
          title: "Actualización de tu cita", message,
          route: uid === appointment.pacienteUid ?
            "/sesiones" : "/psicologo/sesiones",
          metadata: {citaId: id, terapiaId: appointment.terapiaId},
          readAt: null, createdAt: now,
        });
      });
}

class SchedulingService {
  constructor(db, now = () => Date.now()) {
    this.db = db;
    this.now = now;
  }

  async user(uid) {
    if (!uid) throw new HttpsError("unauthenticated", "Inicia sesión.");
    const snapshot = await this.db.collection("users").doc(uid).get();
    if (!snapshot.exists || snapshot.data().accountStatus === "disabled") {
      throw new HttpsError("permission-denied", "Tu cuenta no está disponible.");
    }
    return snapshot.data();
  }

  async therapist(uid, id) {
    await this.user(uid);
    if (!id) throw new HttpsError("invalid-argument", "Falta el psicólogo.");
    const ref = this.db.collection("therapists").doc(text(id, 180));
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data().uid !== uid ||
      snapshot.data().activo === false) {
      throw new HttpsError("permission-denied", "No puedes editar esta agenda.");
    }
    return {ref, ...snapshot.data()};
  }

  async getCalendar(uid, data) {
    const therapist = await this.therapist(uid, data.therapistId);
    return {settings: therapist.scheduleSettings || calendar.DEFAULT_SETTINGS};
  }

  async project(uid, data) {
    const therapist = await this.therapist(uid, data.therapistId);
    const generated = calendar.generateSlots(data, this.now());
    const lockRef = this.db.collection("schedule_locks").doc(therapist.ref.id);
    return this.db.runTransaction(async (tx) => {
      await tx.get(lockRef);
      const from = calendar.dateKey(calendar.timestamp(data.fromDate) - calendar.DAY);
      const to = calendar.dateKey(calendar.timestamp(data.toDate) + calendar.DAY);
      const [slots, appointments] = await Promise.all([
        tx.get(this.db.collection("therapist_availability")
            .where("therapistId", "==", therapist.ref.id)
            .where("date", ">=", from)
            .where("date", "<=", to)),
        tx.get(this.db.collection("citas")
            .where("terapeutaId", "==", therapist.ref.id)
            .where("fecha", ">=", from)
            .where("fecha", "<=", to)),
      ]);
      const occupied = slots.docs.filter((s) => s.data().status !== "closed")
          .map((s) => calendar.interval(s.data()));
      appointments.docs.filter((a) => active(a.data())).forEach((a) => {
        occupied.push(calendar.appointmentInterval(a.data()));
      });
      const publishable = [];
      let conflicts = 0;
      for (const slot of generated.slots) {
        const span = calendar.interval(slot);
        if (occupied.some((other) => calendar.overlaps(span, other))) {
          conflicts++;
          continue;
        }
        occupied.push(span);
        publishable.push(slot);
      }
      if (data.publish === true) {
        for (const slot of publishable) {
          const id = hash(`${therapist.ref.id}:${slot.date}:${slot.startTime}`);
          tx.set(this.db.collection("therapist_availability").doc(id), {
            ...slot, therapistId: therapist.ref.id,
            createdBy: uid, createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        tx.update(therapist.ref, {scheduleSettings: generated.settings,
          updatedAt: FieldValue.serverTimestamp()});
        tx.set(lockRef, {revision: FieldValue.increment(1)}, {merge: true});
      }
      return {slots: publishable, count: publishable.length, conflicts,
        published: data.publish === true, timezone: calendar.TIMEZONE};
    });
  }

  async listSlots(uid, data) {
    await this.user(uid);
    const therapistId = text(data.therapistId, 180);
    const therapist = await this.db.collection("therapists").doc(therapistId).get();
    if (!therapist.exists) return {slots: []};
    const own = therapist.data().uid === uid;
    if (data.includeReserved && !own) {
      throw new HttpsError("permission-denied", "Esta agenda es privada.");
    }
    const from = data.fromDate || calendar.dateKey(this.now());
    const to = data.toDate || calendar.dateKey(this.now() + 84 * calendar.DAY);
    if (calendar.timestamp(to) - calendar.timestamp(from) > 92 * calendar.DAY) {
      throw new HttpsError("invalid-argument", "Consulta hasta 92 días a la vez.");
    }
    let query = this.db.collection("therapist_availability")
        .where("therapistId", "==", therapistId)
        .where("date", ">=", from).where("date", "<=", to);
    if (!data.includeReserved) query = query.where("status", "==", "available");
    const snapshot = await query.orderBy("date").get();
    return {slots: snapshot.docs.map((doc) => {
      const slot = doc.data();
      return {id: doc.id, therapistId, date: slot.date,
        startTime: slot.startTime, endTime: slot.endTime,
        durationMinutes: calendar.interval(slot).durationMinutes,
        bufferMinutes: slot.bufferMinutes || 0,
        minimumNoticeHours: slot.minimumNoticeHours || 0,
        timezone: calendar.TIMEZONE, modality: slot.modality,
        location: slot.location, status: slot.status};
    }).filter((slot) => {
      if (data.includeReserved) return slot.status !== "closed";
      try {
        calendar.assertBookable(slot, this.now(), slot.minimumNoticeHours);
        return therapist.data().activo !== false;
      } catch {
        return false;
      }
    }).sort((a, b) => `${a.date}${a.startTime}`
        .localeCompare(`${b.date}${b.startTime}`))};
  }

  async closeSlots(uid, data) {
    const therapist = await this.therapist(uid, data.therapistId);
    const lockRef = this.db.collection("schedule_locks").doc(therapist.ref.id);
    if (!data.slotId) {
      const length = calendar.timestamp(data.toDate) -
        calendar.timestamp(data.fromDate);
      if (length < 0 || length > 84 * calendar.DAY) {
        throw new HttpsError("invalid-argument", "Revisa el rango de fechas.");
      }
    }
    return this.db.runTransaction(async (tx) => {
      await tx.get(lockRef);
      const target = data.slotId ?
        this.db.collection("therapist_availability").doc(text(data.slotId)) :
        this.db.collection("therapist_availability")
            .where("therapistId", "==", therapist.ref.id)
            .where("date", ">=", data.fromDate)
            .where("date", "<=", data.toDate);
      const snapshot = await tx.get(target);
      const docs = data.slotId ? (snapshot.exists ? [snapshot] : []) : snapshot.docs;
      if (docs.length > 400) {
        throw new HttpsError("invalid-argument", "Cierra un periodo más corto.");
      }
      let closed = 0;
      let reserved = 0;
      for (const doc of docs) {
        if (doc.data().therapistId !== therapist.ref.id) {
          throw new HttpsError("permission-denied", "El bloque no es tuyo.");
        }
        if (["held", "booked"].includes(doc.data().status)) {
          reserved++;
        } else if (doc.data().status === "available") {
          tx.update(doc.ref, {status: "closed",
            updatedAt: FieldValue.serverTimestamp()});
          closed++;
        }
      }
      if (data.slotId && reserved) {
        throw new HttpsError("failed-precondition",
            "El bloque acaba de reservarse. Gestiona la cita desde tu agenda.");
      }
      tx.set(lockRef, {revision: FieldValue.increment(1)}, {merge: true});
      return {closed, reserved};
    });
  }

  async mutateAppointment(uid, data) {
    const user = await this.user(uid);
    const id = text(data.citaId, 180);
    if (!id) throw new HttpsError("invalid-argument", "Falta la cita.");
    const ref = this.db.collection("citas").doc(id);
    return this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new HttpsError("not-found", "No encontramos la cita.");
      const current = snapshot.data();
      const therapistRef = this.db.collection("therapists").doc(current.terapeutaId);
      const therapist = (await tx.get(therapistRef)).data() || {};
      const isTherapist = therapist.uid === uid;
      const isPatient = current.pacienteUid === uid;
      const isAdmin = (user.roles || []).includes("admin");
      if (!isPatient && !isTherapist && !isAdmin) {
        throw new HttpsError("permission-denied", "No puedes modificar esta cita.");
      }
      if (data.revision !== undefined &&
        Number(data.revision) !== Number(current.revision || 0)) {
        throw new HttpsError("aborted",
            "La cita cambió mientras la editabas. Actualiza tu agenda.");
      }
      const bookingRef = current.bookingId ?
        this.db.collection("bookings").doc(current.bookingId) : null;
      const booking = bookingRef ? (await tx.get(bookingRef)).data() : null;
      if (booking && (String(booking.status).startsWith("cancelled") ||
        ["refunded", "refund_pending", "chargeback"].includes(booking.status))) {
        throw new HttpsError("failed-precondition", "La reserva ya no está activa.");
      }
      const lockRef = this.db.collection("schedule_locks").doc(current.terapeutaId);
      await tx.get(lockRef);
      const next = {...current, psychologistUid: therapist.uid || "",
        revision: Number(current.revision || 0) + 1,
        updatedAt: FieldValue.serverTimestamp()};
      let claimSlot = null;
      let event = "appointment_updated";
      let message = "Se actualizaron los datos de tu cita.";
      if (data.action === "reschedule") {
        if (!active(current) || therapist.activo === false) {
          throw new HttpsError("failed-precondition", "Esta cita no se puede reprogramar.");
        }
        const original = calendar.appointmentInterval(current);
        if (original.start <= this.now() || (isPatient && !isTherapist &&
          !isAdmin && original.start - this.now() <= 24 * 60 * calendar.MINUTE)) {
          throw new HttpsError("failed-precondition",
              "Para reprogramar necesitas más de 24 horas de anticipación.");
        }
        if (!data.slotId || data.slotId === current.availabilitySlotId) {
          throw new HttpsError("invalid-argument", "Selecciona un nuevo horario.");
        }
        const slotRef = this.db.collection("therapist_availability").doc(text(data.slotId));
        const previousRef = current.availabilitySlotId ?
          this.db.collection("therapist_availability").doc(current.availabilitySlotId) : null;
        const [slotDoc, previous] = await Promise.all([
          tx.get(slotRef), previousRef ? tx.get(previousRef) : null,
        ]);
        const slot = slotDoc.data() || {};
        const span = calendar.assertBookable(slot, this.now(), slot.minimumNoticeHours);
        if (slot.therapistId !== current.terapeutaId ||
          (booking && (span.durationMinutes !== original.durationMinutes ||
            slot.modality !== current.modalidad))) {
          throw new HttpsError("failed-precondition",
              "Elige un horario del mismo psicólogo, duración y modalidad.");
        }
        claimSlot = await checkSlotConflicts(tx, this.db,
            {...slot, id: slotRef.id}, current.pacienteUid, id);
        // The destination slot is the only authority for all schedule fields.
        Object.assign(next, {fecha: slot.date, hora: slot.startTime,
          endTime: slot.endTime, durationMinutes: span.durationMinutes,
          bufferMinutes: slot.bufferMinutes || 0, timezone: calendar.TIMEZONE,
          startsAt: Timestamp.fromMillis(span.start), endsAt: Timestamp.fromMillis(span.end),
          modalidad: slot.modality, ubicacion: slot.location,
          availabilitySlotId: slotRef.id,
          ...reminderFields(span.start, Number(current.scheduleVersion || 1) + 1)});
        if (previous?.exists && previous.data().appointmentId === id) {
          tx.update(previousRef, releasedSlot());
        }
        tx.update(slotRef, {status: "booked", bookedBy: current.pacienteUid,
          appointmentId: id, bookingId: current.bookingId || "",
          updatedAt: FieldValue.serverTimestamp()});
        if (bookingRef) {
          tx.update(bookingRef, {
            slotId: slotRef.id, date: slot.date, startTime: slot.startTime,
            endTime: slot.endTime, startsAt: next.startsAt, endsAt: next.endsAt,
            timezone: calendar.TIMEZONE, durationMinutes: span.durationMinutes,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        event = "appointment_rescheduled";
        message = `Tu cita fue reprogramada para el ${slot.date} a las ${slot.startTime} (hora de Perú).`;
      } else if (data.action === "status") {
        if (!isTherapist && !isAdmin) {
          throw new HttpsError("permission-denied", "Solo el psicólogo puede cerrar la sesión.");
        }
        if (data.estado === "cancelada") {
          throw new HttpsError("failed-precondition", "Usa la opción de cancelar cita.");
        }
        calendar.assertTransition(current, data.estado, this.now());
        if (current.estado === data.estado) return {id, duplicate: true};
        next.estado = data.estado;
        event = data.estado === "realizada" ? "appointment_completed" :
          data.estado === "no_asistio" ? "appointment_no_show" : "appointment_confirmed";
        message = data.estado === "realizada" ? "La sesión fue marcada como realizada." :
          data.estado === "no_asistio" ? "Se registró una inasistencia en tu sesión." : "Tu cita fue confirmada.";
        if (["realizada", "no_asistio"].includes(data.estado)) {
          next.completedAt = FieldValue.serverTimestamp();
          next.sessionSummary = text(data.sessionSummary, 4000);
          next.nextReminderAt = null;
          if (bookingRef) {
            tx.update(bookingRef, {status: data.estado === "realizada" ?
            "completed" : "no_show", completedAt: FieldValue.serverTimestamp(),
            payoutEligible: data.estado === "realizada" && booking.paymentStatus === "approved",
            updatedAt: FieldValue.serverTimestamp()});
          }
        }
      } else if (data.action === "details") {
        if (!isTherapist && !isAdmin) {
          throw new HttpsError("permission-denied", "Solo el psicólogo puede editar el enlace.");
        }
        if (!active(current)) {
          throw new HttpsError("failed-precondition", "Esta sesión ya está cerrada.");
        }
        const url = text(data.meetingUrl, 2000);
        if (url) {
          let parsed;
          try {
            parsed = new URL(url);
          } catch {/* Validated below. */}
          if (!parsed || parsed.protocol !== "https:") {
            throw new HttpsError("invalid-argument", "Ingresa un enlace seguro que empiece con https://.");
          }
        }
        Object.assign(next, {meetingProvider: text(data.meetingProvider, 80),
          meetingUrl: url, notas: text(data.notas, 800),
          meetingUrlUpdatedAt: FieldValue.serverTimestamp()});
        message = "El psicólogo actualizó los datos y el enlace de tu sesión.";
      } else {
        throw new HttpsError("invalid-argument", "Acción no válida.");
      }
      tx.set(ref, next);
      if (claimSlot) claimSlot();
      else tx.set(lockRef, {revision: FieldValue.increment(1)}, {merge: true});
      writeAppointmentEvent(this.db, tx, id, next, uid, event, message);
      return {id, citaId: id, revision: next.revision};
    });
  }

  async sendReminders() {
    const due = await this.db.collection("citas").where("estado", "==", "confirmada")
        .where("nextReminderAt", "<=", Timestamp.fromMillis(this.now()))
        .orderBy("nextReminderAt").limit(200).get();
    for (const doc of due.docs) {
      await this.db.runTransaction(async (tx) => {
        const latest = await tx.get(doc.ref);
        const a = latest.data();
        if (!a || a.estado !== "confirmada" || !a.nextReminderAt ||
          a.nextReminderAt.toMillis() > this.now()) return;
        const start = calendar.appointmentInterval(a).start;
        if (start <= this.now()) {
          tx.update(doc.ref, {nextReminderAt: null});
          return;
        }
        const therapist = (await tx.get(this.db.collection("therapists")
            .doc(a.terapeutaId))).data() || {};
        const stages = new Set(a.reminderStages || []);
        const hour = 60 * calendar.MINUTE;
        const stage = start - this.now() <= 2 * hour ? "2h" : "24h";
        if (!stages.has(stage)) {
          [a.pacienteUid, therapist.uid].filter(Boolean).forEach((uid) => {
            const key = hash(`reminder:${doc.id}:${a.scheduleVersion || 1}:${stage}:${uid}`);
            const missing = uid === therapist.uid && a.modalidad === "Remoto" && !a.meetingUrl;
            tx.set(this.db.collection("notifications").doc(key), {
              recipientUid: uid, actorUid: "system", type: "appointment_reminder",
              title: missing ? "Agrega el enlace de la sesión" : "Recuerda tu próxima sesión",
              message: `Tu sesión es el ${a.fecha} a las ${a.hora} (hora de Perú).` +
                (missing ? " El paciente aún no tiene un enlace para entrar." : ""),
              route: uid === a.pacienteUid ? "/sesiones" : "/psicologo/sesiones",
              metadata: {citaId: doc.id, terapiaId: a.terapiaId},
              readAt: null, createdAt: FieldValue.serverTimestamp(),
            });
          });
          stages.add(stage);
        }
        tx.update(doc.ref, {reminderStages: [...stages],
          nextReminderAt: stage === "2h" ? null : Timestamp.fromMillis(start - 2 * hour)});
      });
    }
    return {checked: due.size};
  }

  async cancelAppointment(uid, data) {
    const result = await this.cancelReservation(uid, data);
    if (result.refundRequired) {
      // A paid cancellation uses the payment endpoint so that the refund is
      // retried through its provider. Legacy appointments need no provider.
      return {...result, paymentActionRequired: true};
    }
    return result;
  }

  async cancelReservation(uid, data) {
    const user = await this.user(uid);
    const id = text(data.bookingId || data.citaId, 180);
    if (!id) throw new HttpsError("invalid-argument", "Falta la cita.");
    const citaRef = this.db.collection("citas").doc(id);
    const bookingRef = this.db.collection("bookings").doc(id);
    return this.db.runTransaction(async (tx) => {
      const [citaDoc, bookingDoc] = await Promise.all([
        tx.get(citaRef), tx.get(bookingRef),
      ]);
      const booking = bookingDoc.data();
      const cita = citaDoc.data();
      if (!booking && !cita) throw new HttpsError("not-found", "No encontramos la cita.");
      const therapistId = cita?.terapeutaId || booking.psychologistId;
      const therapist = (await tx.get(this.db.collection("therapists").doc(therapistId))).data() || {};
      const patientId = cita?.pacienteUid || booking.patientId;
      const isPsychologist = therapist.uid === uid;
      const isAdmin = (user.roles || []).includes("admin");
      if (uid !== patientId && !isPsychologist && !isAdmin) {
        throw new HttpsError("permission-denied", "La cita no pertenece a tu cuenta.");
      }
      const paymentRef = booking ? this.db.collection("payments").doc(id) : null;
      const payment = paymentRef ? (await tx.get(paymentRef)).data() : null;
      const cancelledBy = isPsychologist ? "psychologist" : isAdmin ? "platform" : "patient";
      if (cita?.estado === "cancelada" || booking?.cancelledAt) {
        return {bookingId: id, status: booking?.status || "cancelled", duplicate: true,
          refundRequired: Boolean(booking?.refundRequired &&
            ["approved", "refund_pending"].includes(payment?.status)),
          reasonCode: booking?.cancellationReason || "requested"};
      }
      if (cita) calendar.assertTransition(cita, "cancelada", this.now());
      if (booking && ["completed", "no_show", "refunded", "chargeback"].includes(booking.status)) {
        throw new HttpsError("failed-precondition", "La reserva ya está cerrada.");
      }
      const startsAt = cita ? calendar.appointmentInterval(cita).start :
        booking.startsAt.toMillis();
      const policy = evaluateCancellationPolicy({startsAtMs: startsAt,
        cancelledAtMs: this.now(), cancelledBy});
      const refundRequired = policy.refundable && payment?.status === "approved";
      const slotId = cita?.availabilitySlotId || booking?.slotId;
      const slotRef = slotId ? this.db.collection("therapist_availability").doc(slotId) : null;
      const slot = slotRef ? await tx.get(slotRef) : null;
      const lockRef = this.db.collection("schedule_locks").doc(therapistId);
      await tx.get(lockRef);
      const now = FieldValue.serverTimestamp();
      if (slot?.exists && (slot.data().appointmentId === id || slot.data().bookingId === id)) {
        tx.update(slotRef, releasedSlot());
      }
      if (booking) {
        tx.update(bookingRef, {status: `cancelled_by_${cancelledBy}`,
          cancelledAt: now, cancelledBy: uid,
          cancellationReason: text(data.reason, 500) || `${cancelledBy}_cancelled`,
          cancellationPolicy: policy, refundRequired,
          paymentStatus: refundRequired ? "refund_pending" : payment?.status || "cancelled",
          payoutEligible: false, updatedAt: now});
        // In-flight charges can still arrive; the cancellation marker makes
        // their approval go to review instead of resurrecting the appointment.
      }
      if (cita) {
        const next = {...cita, estado: "cancelada", psychologistUid: therapist.uid || "",
          revision: Number(cita.revision || 0) + 1,
          cancelledAt: now, cancelledBy: uid, cancellationReason: text(data.reason, 500),
          nextReminderAt: null, updatedAt: now,
          ...(refundRequired ? {paymentStatus: "refund_pending"} : {})};
        tx.set(citaRef, next);
        writeAppointmentEvent(this.db, tx, id, next, uid,
            "appointment_cancelled", "Tu cita fue cancelada.");
      }
      tx.set(lockRef, {revision: FieldValue.increment(1)}, {merge: true});
      return {bookingId: id, status: "cancelled", refundable: policy.refundable,
        refundRequired, reasonCode: `${cancelledBy}_cancelled`};
    });
  }
}

function releasedSlot() {
  return {status: "available", bookedBy: "", appointmentId: "", bookingId: "",
    heldBy: FieldValue.delete(), holdExpiresAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp()};
}

module.exports = {SchedulingService, reminderFields, writeAppointmentEvent, releasedSlot};
