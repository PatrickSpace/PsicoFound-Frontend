import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/plugins/Firebase/firestore';

const confirmedStatuses = new Set([
  'confirmada', 'confirmado', 'confirmed', 'realizada', 'realizado',
  'completada', 'completado', 'completed', 'inasistencia', 'no_asistio', 'no_show',
]);
const evidenceTypes = ['appointment_confirmed', 'appointment_completed', 'payment_confirmed'];

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function hasConfirmedAppointment(appointments, therapies, events) {
  if (events.some(event => event.sourceType === 'appointment' && event.sourceId)) return true;
  const confirmedPayments = new Set(events
    .filter(event => event.eventType === 'payment_confirmed' && event.sourceId)
    .map(event => event.sourceId));
  // A late payment can enter refund review without ever confirming the appointment.
  const isConfirmed = appointment => confirmedStatuses.has(normalize(appointment.estado ?? appointment.status)) ||
    Boolean(appointment.confirmedAt || appointment.completedAt || appointment.attendedAt) ||
    normalize(appointment.paymentStatus) === 'confirmed' ||
    confirmedPayments.has(appointment.paymentOperationId);

  const officialIds = new Set(appointments.map(doc => doc.id));
  return appointments.some(doc => isConfirmed(doc.data())) ||
    therapies.some(therapy => {
      const summaries = therapy.data().citas;
      return Array.isArray(summaries) && summaries.some(appointment => {
        if (!appointment) return false;
        const id = appointment.citaId || appointment.id;
        return !officialIds.has(id) && isConfirmed(appointment);
      });
    });
}

export function watchPatientWelcome(uid, onEligibility) {
  const sources = [
    query(collection(db, 'citas'), where('pacienteUid', '==', uid)),
    query(collection(db, 'terapias'), where('pacienteUid', '==', uid)),
    query(collection(db, 'longitudinal_history'), where('pacienteUid', '==', uid), where('eventType', 'in', evidenceTypes)),
  ];
  const results = Array(sources.length).fill(null);
  let active = true;
  const stops = sources.map((source, index) => onSnapshot(source, { includeMetadataChanges: true }, snapshot => {
    if (!active) return;
    results[index] = snapshot.metadata.fromCache ? null : snapshot.docs;
    if (results.some(result => result === null)) {
      onEligibility(false);
      return;
    }
    const [appointments, therapies, eventDocs] = results;
    onEligibility(!hasConfirmedAppointment(appointments, therapies, eventDocs.map(doc => doc.data())));
  }, () => {
    if (!active) return;
    results[index] = null;
    onEligibility(false);
  }));

  return () => {
    active = false;
    stops.forEach(stop => stop());
  };
}
