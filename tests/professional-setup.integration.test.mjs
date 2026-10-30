import { beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { seedPatient, seedSlots, httpCall, reserve } from './helpers/patient-http.mjs';
import { adminApps, adminFirestore } from './helpers/admin-sdk.mjs';
let app, db;
beforeEach(async () => {
  app = await seedPatient(); db = adminFirestore.getFirestore(app);
  await seedSlots(db, '2099-01-02');
  await db.doc('therapists/therapist-a').update({ setupVersion: 1, acceptingBookings: false, bookingSettingsVersion: 0,
    description: 'Presentación profesional de prueba', licenseNumber: 'QA-ONLY' });
});
after(async () => { if (app) await adminApps.deleteApp(app); });
async function change(action, extra = {}) {
  const state = await httpCall('A', 'getProfessionalSetup', {});
  return httpCall('A', 'updateProfessionalSetup', { action, expectedVersion: state.version,
    fingerprint: state.profileFingerprint, activationFingerprint: state.activationFingerprint, ...extra });
}
test('setup rejects patient, unauthenticated role and inactive/suspended professionals', async () => {
  await assert.rejects(httpCall('B', 'getProfessionalSetup', {}), { code: 'permission-denied' });
  await db.doc('therapists/therapist-a').update({ activo: false });
  await assert.rejects(httpCall('A', 'getProfessionalSetup', {}), { code: 'permission-denied' });
  await db.doc('therapists/therapist-a').update({ activo: true });
  await db.doc('users/professional-a').update({ accountStatus: 'suspended' });
  await assert.rejects(httpCall('A', 'getProfessionalSetup', {}), { code: 'permission-denied' });
});
test('test price blocks activation; real rate, review and future slot enable it', async () => {
  await change('review');
  await assert.rejects(change('activate'), { code: 'failed-precondition' });
  await db.doc('payment_rates/review-rate').update({ isTest: false });
  await change('activate');
  const state = await httpCall('A', 'getProfessionalSetup', {});
  assert.equal(state.completedAt, true); assert.equal(state.acceptingBookings, true);
  const quote = await httpCall('B', 'getBookingQuote', { therapistId: 'therapist-a', availabilitySlotId: 'review-ten' });
  assert.equal(quote.amountMinor, 12000);
});
test('pause blocks matching, quotes and stale reservations, while retaining therapy and history', async () => {
  await db.doc('payment_rates/review-rate').update({ isTest: false });
  await change('review'); await change('activate');
  const quote = await httpCall('B', 'getBookingQuote', { therapistId: 'therapist-a' });
  await change('pause');
  await assert.rejects(httpCall('B', 'getBookingQuote', { therapistId: 'therapist-a' }), { code: 'failed-precondition' });
  await assert.rejects(httpCall('B', 'reserveAppointment', { mode: 'patient', terapeutaId: 'therapist-a', terapiaId: 'b-active',
    availabilitySlotId: 'review-ten', requestId: 'stale-setup-quote', quoteId: quote.quoteId, shareSurveyHistoryConsent: true }), { code: 'failed-precondition' });
  const matching = await httpCall('B', 'getRecommendedTherapists', {});
  assert.equal(matching.therapists.some(item => item.id === 'therapist-a'), false);
  assert.equal((await db.doc('terapias/b-active').get()).exists, true);
  assert.equal((await db.doc('therapists/therapist-a').get()).data().activo, true);
  await change('activate');
  const reservation = await reserve('review-ten', 'setup-reservation');
  assert.ok(reservation.appointmentId);
  const appointmentBefore = (await db.doc(`citas/${reservation.appointmentId}`).get()).data();
  await change('pause');
  assert.equal((await db.doc(`citas/${reservation.appointmentId}`).get()).data().estado, appointmentBefore.estado);
  await httpCall('A', 'rescheduleAppointment', { appointmentId: reservation.appointmentId, mode: 'psychologist',
    availabilitySlotId: 'review-fourteen', requestId: 'setup-paused-existing-reschedule' });
  assert.equal((await db.doc(`citas/${reservation.appointmentId}`).get()).data().availabilitySlotId, 'review-fourteen');
});
test('concurrent settings and changed preview cannot silently activate', async () => {
  await db.doc('payment_rates/review-rate').update({ isTest: false });
  const before = await httpCall('A', 'getProfessionalSetup', {});
  await change('review');
  await assert.rejects(change('pause', { expectedVersion: before.version }), { code: 'aborted' });
  const reviewed = await httpCall('A', 'getProfessionalSetup', {});
  await db.doc('payment_rates/review-rate').update({ amountMinor: 13000, version: 2 });
  await assert.rejects(change('activate', { activationFingerprint: reviewed.activationFingerprint }), { code: 'aborted' });
  await db.doc('therapist_availability/review-ten').update({ status: 'closed' });
  await db.doc('therapist_availability/review-fourteen').update({ status: 'closed' });
  await assert.rejects(change('activate'), { code: 'failed-precondition' });
});
test('guide progress persists by role and rejects forged role or out-of-range step', async () => {
  await httpCall('A', 'saveProductGuide', { role: 'psychologist', step: 2, status: 'started' });
  const user = (await db.doc('users/professional-a').get()).data();
  assert.equal(user.productGuides.psychologist.step, 2);
  await assert.rejects(httpCall('B', 'saveProductGuide', { role: 'psychologist', step: 1, status: 'started' }), { code: 'permission-denied' });
  await assert.rejects(httpCall('A', 'saveProductGuide', { role: 'patient', step: 3, status: 'started' }), { code: 'invalid-argument' });
  await assert.rejects(httpCall('review-admin', 'saveProductGuide', { role: 'patient', step: 1, status: 'started' }), { code: 'permission-denied' });
  await httpCall('B', 'saveProductGuide', { role: 'patient', step: 1, status: 'dismissed' });
  assert.equal((await db.doc('users/patient-b').get()).data().productGuides.patient.step, 1);
});
test('administration can inspect preparation but patients cannot request another profile', async () => {
  const state = await httpCall('review-admin', 'getProfessionalSetup', { therapistId: 'therapist-a' });
  assert.equal(state.profile.nombre, 'Profesional A');
  assert.equal(state.rateReady, false);
  await assert.rejects(httpCall('B', 'getProfessionalSetup', { therapistId: 'therapist-a' }), { code: 'permission-denied' });
  await assert.rejects(httpCall('A', 'getProfessionalSetup', { therapistId: 'therapist-d' }), { code: 'permission-denied' });
});
