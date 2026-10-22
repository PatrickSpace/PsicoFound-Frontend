import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { seedPatient, seedSlots, reserve, httpCall } from './helpers/patient-http.mjs';
import { adminApps, adminFirestore } from './helpers/admin-sdk.mjs';
const require = createRequire(import.meta.url);
const {fingerprint, validateCommercialPolicy} = require('../functions/src/payments/commercialPolicy');
let app, db;
beforeEach(async () => { app = await seedPatient(); db = adminFirestore.getFirestore(app); await seedSlots(db); });
after(async () => { await adminApps.deleteApp(app); });
const read = async path => (await db.doc(path).get()).data();
const op = async id => read(`payment_operations/${id}`);
const submit = id => httpCall('B', 'markPaymentSubmitted', {operationId: id});
const review = (id, status = 'confirmed', providerReference = 'receipt-1') => httpCall('review-admin', 'reviewPaymentOperation', {operationId: id, status, providerReference});
async function submitted(id = 'reserve-one') { const result = await reserve('review-ten', id); await submit(result.appointmentId); return result.appointmentId; }
async function due(id, expireSubmitted = false) {
  const operation = await op(id);
  const policy = operation.rateSnapshot.commercialPolicy;
  if (expireSubmitted) {
    policy.submittedExpiration = 'expire'; delete policy.fingerprint;
    policy.fingerprint = fingerprint(policy);
  }
  await db.doc(`payment_operations/${id}`).update({expiresAt: adminFirestore.Timestamp.fromMillis(Date.now() - 1000),
    'rateSnapshot.commercialPolicy': policy});
}

test('D-01/02: immutable quote, payload retry binding, no unapproved or test commercial rates', async () => {
  const result = await reserve(); const id = result.appointmentId;
  const operation = await op(id);
  assert.equal(operation.expirationPolicyConfigured, true);
  assert.equal(operation.rateSnapshot.commercialPolicy.version, 'synthetic-commercial-v1');
  await db.doc('payment_rates/review-rate').update({amountMinor: 99000, version: 2});
  assert.equal((await op(id)).amountMinor, 12000);
  await assert.rejects(reserve('review-fourteen'), {code: 'already-exists'});
  assert.throws(() => validateCommercialPolicy(null), {code: 'failed-precondition'});
  const {quoteFromRate} = require('../functions/src/payments/paymentOperationHandlers');
  const policy = {...operation.rateSnapshot.commercialPolicy, status: 'approved'};
  assert.throws(() => quoteFromRate('a', {}, 'b', {isTest: true}, policy), {code: 'failed-precondition'});
  for (const who of ['B', 'C', 'A']) await assert.rejects(httpCall(who, 'expirePaymentReservation', {operationId: id}), {code: 'permission-denied'});
});

test('D-01: expiration releases owned slot and syncs appointment, therapy, event and notification exactly once', async () => {
  const {appointmentId: id} = await reserve();
  await assert.rejects(httpCall('review-admin', 'expirePaymentReservation', {operationId: id}), {code: 'failed-precondition'});
  await due(id);
  await assert.rejects(submit(id), {code: 'failed-precondition'});
  const results = await Promise.all([1,2].map(() => httpCall('review-admin', 'expirePaymentReservation', {operationId: id})));
  assert.deepEqual(results[0], results[1]);
  assert.equal((await read(`citas/${id}`)).estado, 'cancelada');
  assert.equal((await read('terapias/b-active')).citas.find(c => c.citaId === id).paymentStatus, 'expired');
  assert.equal((await read('therapist_availability/review-ten')).status, 'available');
  assert.equal((await read(`longitudinal_history/payment_${id}_expired`)).eventType, 'payment_expired');
  assert.equal((await read(`notifications/payment_${id}_expired`)).recipientUid, 'patient-b');
  await assert.rejects(review(id), {code: 'failed-precondition'});
});

test('D-02: concurrent duplicate provider receipt credits only one appointment', async () => {
  const first = await submitted();
  const quote = await httpCall('C', 'getBookingQuote', {therapistId: 'therapist-a'});
  const second = (await httpCall('C', 'reserveAppointment', {terapeutaId:'therapist-a', availabilitySlotId:'review-fourteen',
    requestId:'other-patient', quoteId:quote.quoteId, mode:'patient',
    shareSurveyHistoryConsent:true})).appointmentId;
  await httpCall('C','markPaymentSubmitted',{operationId:second});
  const results = await Promise.allSettled([review(first), review(second)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'already-exists');
  const winner = (await op(first)).status === 'confirmed' ? first : second;
  await review(winner);
  assert.equal((await db.collection('payment_receipts').get()).size, 1);
  assert.equal((await db.collection('professional_obligations').get()).size, 1);
});

test('D-01/02: confirmation races expiry and cancellation without resurrecting a closed appointment', async () => {
  const id = await submitted(); await due(id, true);
  const results = await Promise.allSettled([review(id), httpCall('review-admin','expirePaymentReservation',{operationId:id})]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const operation = await op(id), appointment = await read(`citas/${id}`);
  assert.equal(appointment.paymentStatus, operation.status);
  assert.equal((await read('therapist_availability/review-ten')).status, operation.status === 'expired' ? 'available' : 'booked');
  if (operation.status === 'confirmed') {
    await httpCall('B','changeAppointmentStatus',{appointmentId:id,mode:'patient',status:'cancelada',requestId:'cancel-race'});
    assert.equal((await op(id)).status,'refund_review');
    await assert.rejects(review(id),{code:'failed-precondition'});
  }
});

test('D-03: calculated obligation differs from actual transfer; retries, overpayment and refunds retain ledger', async () => {
  const id = await submitted(); await review(id);
  const obligation = await read(`professional_obligations/${id}`);
  assert.equal(obligation.calculatedMinor,8400); assert.equal(obligation.paidMinor,0); assert.equal(obligation.pendingMinor,8400);
  const data = {operationId:id,transferReference:'bank-one',amountMinor:4000,currency:'PEN'};
  for (const who of ['B','A']) await assert.rejects(httpCall(who,'recordProfessionalTransfer',data),{code:'permission-denied'});
  const transfers = await Promise.all([1,2].map(() => httpCall('review-admin','recordProfessionalTransfer',data)));
  assert.deepEqual(transfers[0],transfers[1]);
  await assert.rejects(httpCall('review-admin','recordProfessionalTransfer',{...data,amountMinor:4001}),{code:'already-exists'});
  await assert.rejects(httpCall('review-admin','recordProfessionalTransfer',{...data,transferReference:'bank-two',amountMinor:5000}),{code:'failed-precondition'});
  await httpCall('B','requestPaymentRefundReview',{operationId:id,reason:'Caso sintético'});
  await assert.rejects(httpCall('review-admin','recordProfessionalTransfer',{...data,transferReference:'bank-two'}),{code:'failed-precondition'});
  await review(id,'refunded','refund-one'); await review(id,'refunded','refund-one');
  const refunded = await read(`professional_obligations/${id}`);
  assert.equal(refunded.status,'recovery_review'); assert.equal(refunded.paidMinor,4000); assert.equal(refunded.pendingMinor,0);
  assert.equal((await db.collection('professional_transfers').get()).size,1);
  assert.equal((await read(`citas/${id}`)).estado,'cancelada');
  assert.equal((await read('therapist_availability/review-ten')).status,'available');
});

test('D-01: submitted hold follows captured policy; rejection closes booking; cutoff is server enforced', async () => {
  const id = await submitted(); await due(id);
  await assert.rejects(httpCall('review-admin','expirePaymentReservation',{operationId:id}),{code:'failed-precondition'});
  const appointment = await read(`citas/${id}`);
  const policy = appointment.paymentSnapshot.commercialPolicy;
  policy.patientCancellationCutoffMinutes = 525600; policy.patientRescheduleCutoffMinutes = 525600;
  delete policy.fingerprint; policy.fingerprint = fingerprint(policy);
  await db.doc(`citas/${id}`).update({'paymentSnapshot.commercialPolicy':policy});
  await assert.rejects(httpCall('B','changeAppointmentStatus',{appointmentId:id,status:'cancelada',mode:'patient',requestId:'cutoff-cancel'}),{code:'failed-precondition'});
  await assert.rejects(httpCall('B','rescheduleAppointment',{appointmentId:id,availabilitySlotId:'review-fourteen',mode:'patient',requestId:'cutoff-reschedule'}),{code:'failed-precondition'});
  await review(id,'rejected','');
  assert.equal((await read(`citas/${id}`)).estado,'cancelada');
  assert.equal((await read('terapias/b-active')).citas.find(c => c.citaId === id).paymentStatus,'rejected');
});

test('D-02: cancellation racing confirmation never leaves a paid booking open or a transferable cancelled obligation',async()=>{
  const id=await submitted();
  const cancel={appointmentId:id,mode:'patient',status:'cancelada',requestId:'concurrent-cancel'};
  const results=await Promise.allSettled([review(id),httpCall('B','changeAppointmentStatus',cancel)]);
  assert.equal(results[1].status,'fulfilled');
  await httpCall('B','changeAppointmentStatus',cancel);
  const operation=await op(id);
  assert.ok(['cancelled','refund_review'].includes(operation.status));
  assert.equal((await read(`citas/${id}`)).estado,'cancelada');
  assert.equal((await read('therapist_availability/review-ten')).status,'available');
  assert.equal((await read('terapias/b-active')).citas.find(c=>c.citaId===id).paymentStatus,operation.status);
  if(operation.status==='refund_review') {
    assert.equal((await read(`professional_obligations/${id}`)).status,'refund_review');
    await assert.rejects(httpCall('review-admin','recordProfessionalTransfer',{operationId:id,transferReference:'race-transfer',amountMinor:1,currency:'PEN'}),{code:'failed-precondition'});
  }
});

test('REV-PIL-01: missing/invalid deadlines fail closed and late payment support is owned, linked and idempotent', async () => {
  const {appointmentId: id} = await reserve();
  const ref = db.doc(`payment_operations/${id}`);
  const original = await op(id);
  for (const expiresAt of [null, 'invalid', {seconds:'invalid'}, adminFirestore.Timestamp.fromMillis(Date.now()-1000)]) {
    await ref.update({expiresAt});
    await assert.rejects(submit(id), {code:'failed-precondition'});
    assert.equal((await op(id)).status,'pending');
  }
  const payload = {category:'error',message:'Ya pagué. Solicito revisión.',requestId:'late-payment-review',paymentOperationId:id};
  for (const who of ['C','A']) await assert.rejects(httpCall(who,'createSupportRequest',payload), {code:'permission-denied'});
  await assert.rejects(httpCall('B','createSupportRequest',{...payload,paymentOperationId:'missing-payment'}),{code:'permission-denied'});
  const results = await Promise.all([1,2].map(()=>httpCall('B','createSupportRequest',{...payload,paymentReference:'forged'})));
  assert.deepEqual(results[0],results[1]);
  const support = await read(`support_requests/${results[0].id}`);
  assert.equal(support.paymentOperationId,id);
  assert.equal(support.paymentReference,original.reference);
  assert.equal((await db.collection('support_requests').get()).size,1);
  await assert.rejects(httpCall('B','createSupportRequest',{...payload,message:'Changed retry'}),{code:'already-exists'});
  assert.equal((await op(id)).status,'pending');
  assert.deepEqual((await op(id)).rateSnapshot,original.rateSnapshot);
  assert.equal((await read('therapist_availability/review-ten')).status,'booked');
});
