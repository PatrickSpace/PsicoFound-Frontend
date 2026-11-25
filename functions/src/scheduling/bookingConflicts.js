const {FieldValue} = require("firebase-admin/firestore");

const {HttpsError} = require("firebase-functions/v2/https");
const calendar = require("./calendar");

// All slot claims share these lock documents, including overlapping legacy
// slots that have different IDs. Query results alone are not uniqueness keys.
async function checkSlotConflicts(
    tx,
    db,
    slot,
    patientId,
    excludeId = "",
) {
  const therapistLock = db
      .collection("schedule_locks")
      .doc(slot.therapistId);
  const patientLock = db
      .collection("patient_schedule_locks")
      .doc(patientId);
  const day = calendar.timestamp(slot.date);
  const from = calendar.dateKey(day - calendar.DAY);
  const to = calendar.dateKey(day + calendar.DAY);
  const [
    slots,
    therapistAppointments,
    patientAppointments,
    patientBookings,
  ] = await Promise.all([
    tx.get(
        db
            .collection("therapist_availability")
            .where("therapistId", "==", slot.therapistId)
            .where("date", ">=", from)
            .where("date", "<=", to),
    ),
    tx.get(
        db
            .collection("citas")
            .where("terapeutaId", "==", slot.therapistId)
            .where("fecha", ">=", from)
            .where("fecha", "<=", to),
    ),
    tx.get(
        db
            .collection("citas")
            .where("pacienteUid", "==", patientId)
            .where("fecha", ">=", from)
            .where("fecha", "<=", to),
    ),
    tx.get(
        db
            .collection("bookings")
            .where("patientId", "==", patientId)
            .where("date", ">=", from)
            .where("date", "<=", to),
    ),
    tx.get(therapistLock),
    tx.get(patientLock),
  ]);
  const desired = calendar.interval(slot);
  const conflict =
    slots.docs.some((doc) => {
      const data = doc.data();
      if (
        doc.id === slot.id ||
        (excludeId &&
          (data.bookingId === excludeId ||
            data.appointmentId === excludeId))
      ) {
        return false;
      }
      return (
        ["held", "booked"].includes(data.status) &&
        calendar.overlaps(desired, calendar.interval(data))
      );
    }) ||
    [...therapistAppointments.docs, ...patientAppointments.docs].some(
        (doc) =>
          doc.id !== excludeId &&
        ["pendiente", "confirmada"].includes(doc.data().estado) &&
        calendar.overlaps(
            desired,
            calendar.appointmentInterval(doc.data()),
        ),
    ) ||
    patientBookings.docs.some((doc) => {
      const booking = doc.data();
      if (
        doc.id === excludeId ||
        booking.cancelledAt ||
        ![
          "payment_pending",
          "payment_processing",
          "payment_failed",
          "confirmed",
        ].includes(booking.status)
      ) {
        return false;
      }
      if (
        booking.status !== "confirmed" &&
        booking.holdExpiresAt?.toMillis() < Date.now()
      ) {
        return false;
      }
      return calendar.overlaps(desired, calendar.interval(booking));
    });
  if (conflict) {
    throw new HttpsError(
        "failed-precondition",
        "Ese horario se cruza con una reserva existente. Elige otro bloque.",
    );
  }
  return () => {
    const revision = {revision: FieldValue.increment(1)};
    tx.set(therapistLock, revision, {merge: true});
    tx.set(patientLock, revision, {merge: true});
  };
}

module.exports = {checkSlotConflicts};
