import { beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { seedPatientCare } from './helpers/patient-care-fixture.mjs';
import { httpCall } from './helpers/patient-http.mjs';
import { adminApps } from './helpers/admin-sdk.mjs';
let app, db;
beforeEach(async () => { ({ app, db } = await seedPatientCare()); });
after(async () => { if (app) await adminApps.deleteApp(app); });
const read = () => httpCall('B', 'getPatientCareGuide', {});
const save = (data) => httpCall('B', 'savePatientCareGuide', data);
test('only the same owned confirmed appointment and confirmed payment enable welcome', async () => {
  assert.equal((await read()).welcomeEligible, true);
  for (const patch of [{status: 'submitted'}, {status: 'confirmed', appointmentId: 'unrelated'},
    {status: 'confirmed', appointmentId: 'care-demo', patientUid: 'patient-c'},
    {status: 'confirmed', appointmentId: 'care-demo', patientUid: 'patient-b', therapistId: 'other'}]) {
    await db.doc('payment_operations/care-demo').update(patch);
    assert.equal((await read()).available, false);
  }
});
test('pending, cancelled, refunded and paused therapy do not start care guide', async () => {
  for (const patch of [{estado: 'pendiente'}, {estado: 'cancelada'}, {estado: 'confirmada', paymentStatus: 'refunded'}]) {
    await db.doc('citas/care-demo').update(patch);
    assert.equal((await read()).available, false);
  }
  await db.doc('citas/care-demo').update({estado: 'confirmada', paymentStatus: 'confirmed'});
  await db.doc('terapias/b-active').update({estado: 'pausa'});
  assert.equal((await read()).available, false);
  await assert.rejects(save({kind: 'walkthrough', step: 0, status: 'started'}), {code: 'failed-precondition'});
});
test('progress remains separate, survives reload and cancellation without stale confirmation', async () => {
  await httpCall('B', 'saveProductGuide', {role: 'patient', step: 1, status: 'dismissed'});
  const before = (await db.doc('citas/care-demo').get()).data();
  await save({kind: 'walkthrough', step: 1, status: 'dismissed'});
  await save({kind: 'section', section: 'emociones', status: 'seen'});
  await save({kind: 'exercise', status: 'seen'});
  const state = await read();
  assert.equal(state.progress.step, 1);
  assert.equal(state.progress.sections.emociones, 'seen');
  assert.equal(state.progress.firstExerciseSeen, true);
  assert.equal((await db.doc('users/patient-b').get()).data().productGuides.patient.step, 1);
  assert.deepEqual((await db.doc('citas/care-demo').get()).data(), before);
  await db.doc('citas/care-demo').update({estado: 'cancelada'});
  const cancelled = await read();
  assert.equal(cancelled.available, true); assert.equal(cancelled.welcomeEligible, false); assert.equal(cancelled.appointment, null);
});
test('rejects role forgery, suspended accounts and arbitrary writes', async () => {
  await assert.rejects(httpCall('review-admin', 'getPatientCareGuide', {}), {code: 'permission-denied'});
  for (const data of [{kind: 'section', section: '__proto__', status: 'seen'},
    {kind: 'walkthrough', step: 3, status: 'started'}, {kind: 'walkthrough', step: 1, status: 'started', uid: 'patient-c'}]) {
    await assert.rejects(save(data), {code: 'invalid-argument'});
  }
  await db.doc('users/patient-b').update({accountStatus: 'suspended'});
  await assert.rejects(read());
  await assert.rejects(save({kind: 'walkthrough', step: 0, status: 'started'}));
});
test('completed appointments allow help without saying an upcoming appointment is confirmed', async () => {
  await db.doc('citas/care-demo').update({estado: 'realizada', fecha: '2020-01-01', startAtIso: '2020-01-01T15:00:00Z'});
  const state = await read(); assert.equal(state.available, true); assert.equal(state.welcomeEligible, false);
  assert.equal(state.appointment, null);
});
