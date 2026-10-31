import assert from 'node:assert/strict';
import { seedPatient } from './patient-http.mjs';
import { adminFirestore } from './admin-sdk.mjs';
export async function seedPatientCare() {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-lurems-followup');
  const app = await seedPatient(), db = adminFirestore.getFirestore(app);
  const date = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const appointment = { id: 'care-demo', citaId: 'care-demo', terapiaId: 'b-active', pacienteUid: 'patient-b',
    pacienteNombre: 'María de prueba', terapeutaId: 'therapist-a', terapeutaNombre: 'Ana · demostración',
    fecha: date, hora: '10:00', timeZone: 'America/Lima', startAtIso: `${date}T15:00:00.000Z`,
    estado: 'confirmada', modalidad: 'remoto', paymentStatus: 'confirmed', paymentOperationId: 'care-demo' };
  await db.doc('users/patient-b').update({ nombre: 'María de prueba' });
  await db.doc('citas/care-demo').set(appointment);
  await db.doc('terapias/b-active').update({ citas: [appointment] });
  await db.doc('payment_operations/care-demo').set({ appointmentId: 'care-demo', patientUid: 'patient-b',
    therapistId: 'therapist-a', status: 'confirmed' });
  return { app, db, appointment };
}
