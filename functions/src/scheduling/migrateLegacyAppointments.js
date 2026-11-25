const {FieldValue, Timestamp} = require("firebase-admin/firestore");
// Dry-run by default. Supply --project=<id> and --apply after reviewing totals.

const calendar = require("./calendar");
const {reminderFields} = require("./schedulingService");

async function migrateAppointments(db, {apply = false} = {}) {
  const totals = {
    reviewed: 0,
    created: 0,
    enriched: 0,
    conflicts: 0,
    invalid: 0,
  };
  let cursor;
  do {
    let query = db.collection("terapias").orderBy("__name__").limit(25);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const therapyDoc of page.docs) {
      const therapy = therapyDoc.data();
      for (const legacy of therapy.citas || []) {
        totals.reviewed++;
        const id = legacy.citaId;
        if (typeof id !== "string" || !id || id.includes("/")) {
          totals.invalid++;
          continue;
        }
        const ref = db.collection("citas").doc(id);
        const result = await db.runTransaction(async (tx) => {
          const currentDoc = await tx.get(ref);
          const current = currentDoc.data() || {};
          if (
            currentDoc.exists &&
            (current.terapiaId !== therapyDoc.id ||
              current.pacienteUid !== therapy.pacienteUid ||
              current.terapeutaId !== therapy.terapeutaId)
          ) {
            return "conflicts";
          }
          const merged = {...legacy, ...current};
          const bookingId = current.bookingId || legacy.bookingId;
          const booking = bookingId ?
            (
              await tx.get(db.collection("bookings").doc(bookingId))
            ).data() :
            null;
          if (
            booking &&
            (booking.date !== merged.fecha ||
              booking.startTime !== merged.hora ||
              booking.patientId !== therapy.pacienteUid ||
              booking.psychologistId !== therapy.terapeutaId)
          ) {
            return "conflicts";
          }
          const slot = merged.availabilitySlotId ?
            (
              await tx.get(
                  db
                      .collection("therapist_availability")
                      .doc(merged.availabilitySlotId),
              )
            ).data() :
            null;
          const therapist =
            (
              await tx.get(
                  db.collection("therapists").doc(therapy.terapeutaId),
              )
            ).data() || {};
          let span;
          try {
            span = calendar.appointmentInterval({
              ...merged,
              durationMinutes:
                current.durationMinutes ||
                booking?.durationMinutes ||
                slot?.durationMinutes ||
                60,
            });
          } catch {
            return "invalid";
          }
          const status =
            merged.estado === "completada" ? "realizada" : merged.estado;
          if (
            ![
              "pendiente",
              "confirmada",
              "realizada",
              "cancelada",
              "revision",
              "no_asistio",
            ].includes(status)
          ) {
            return "invalid";
          }
          const now = FieldValue.serverTimestamp();
          const payload = {
            pacienteUid: therapy.pacienteUid,
            terapeutaId: therapy.terapeutaId,
            terapiaId: therapyDoc.id,
            psychologistUid: therapist.uid || "",
            pacienteNombre: therapy.pacienteNombre || "Paciente",
            terapeutaNombre: therapy.terapeutaNombre || "Psicólogo",
            fecha: merged.fecha,
            hora: merged.hora,
            estado: status,
            notas: merged.notas || "",
            modalidad: merged.modalidad || therapy.modalidad || "Remoto",
            ubicacion: merged.ubicacion || "",
            meetingUrl: merged.meetingUrl || "",
            meetingProvider: merged.meetingProvider || "",
            sessionSummary: merged.sessionSummary || "",
            availabilitySlotId: merged.availabilitySlotId || "",
            startsAt: Timestamp.fromMillis(span.start),
            endsAt: Timestamp.fromMillis(span.end),
            durationMinutes: span.durationMinutes,
            bufferMinutes: slot?.bufferMinutes || 0,
            timezone: calendar.TIMEZONE,
            revision: current.revision || 0,
            createdAt: current.createdAt || now,
            updatedAt: current.updatedAt || now,
            migratedAt: now,
            ...(booking ?
              {
                bookingId,
                paymentId: booking.paymentId || bookingId,
                paymentStatus: booking.paymentStatus,
              } :
              {}),
          };
          if (
            !("nextReminderAt" in current) &&
            status === "confirmada" &&
            span.start > Date.now()
          ) {
            Object.assign(payload, reminderFields(span.start));
          }
          if (apply) tx.set(ref, payload, {merge: true});
          return currentDoc.exists ? "enriched" : "created";
        });
        totals[result]++;
      }
    }
    cursor = page.size === 25 ? page.docs.at(-1) : null;
  } while (cursor);
  return totals;
}

module.exports = {migrateAppointments};
