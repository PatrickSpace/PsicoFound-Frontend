import {after, beforeEach, test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHmac} from 'node:crypto';
import {seedPatient, seedSlots, reserve, httpCall} from './helpers/patient-http.mjs';
import {adminApps, adminFirestore} from './helpers/admin-sdk.mjs';
import {initializeApp, deleteApp} from 'firebase/app';
import {getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, terminate, setLogLevel} from 'firebase/firestore';
const require = createRequire(import.meta.url);
const {applyProviderPayment, createCheckout, processInbox, runPaymentMaintenance, ingestPaymentNotification} = require('../functions/src/payments/paymentAutomation');
const {expireOperation} = require('../functions/src/payments/paymentOperationHandlers');
const {syncSource, taskId, ensureChecklist, reopenDueChecklist, bootstrapTasks} = require('../functions/src/operations/adminTasks');
const config = {collectorId: '123', mode: 'test', publicOrigin: 'https://example.test', notificationUrl: 'https://example.test/webhook'};
let app, db;
beforeEach(async () => {app = await seedPatient(); db = adminFirestore.getFirestore(app); await seedSlots(db);});
after(async () => {await adminApps.deleteApp(app);});
const read = async path => (await db.doc(path).get()).data();
async function reservation() {
  const {appointmentId: id} = await reserve();
  await db.doc(`payment_operations/${id}`).update({reconciliation: 'automatic', providerAccountId: '123', providerMode: 'test'});
  return id;
}
function approved(id, patch = {}) {return {id: 123456, external_reference: id, collector_id: 123, live_mode: false, transaction_amount: 120, currency_id: 'PEN', status: 'approved', date_approved: new Date().toISOString(), transaction_amount_refunded: 0, ...patch};}
const pay = (id, patch) => applyProviderPayment(db, approved(id, patch), config);
async function due(id) {await db.doc(`payment_operations/${id}`).update({expiresAt: adminFirestore.Timestamp.fromMillis(Date.now() - 1000)});}

test('automatic confirmation confirms appointment and creates one obligation despite duplicate delivery', async () => {
  const id = await reservation();
  await Promise.all([pay(id), pay(id)]);
  assert.equal((await read(`payment_operations/${id}`)).status, 'confirmed');
  assert.equal((await read(`citas/${id}`)).estado, 'confirmada');
  assert.equal((await read('terapias/b-active')).citas.find(c => c.citaId === id).paymentStatus, 'confirmed');
  assert.equal((await read(`professional_obligations/${id}`)).pendingMinor, 8400);
  assert.equal((await db.collection('payment_receipts').get()).size, 1);
  assert.equal((await db.collection('payment_audit').where('operationId', '==', id).get()).size, 1);
  await assert.rejects(httpCall('B', 'markPaymentSubmitted', {operationId: id}), {code: 'failed-precondition'});
});
test('amount, merchant and mode mismatches create admin exceptions without crediting the reservation', async () => {
  const id = await reservation();
  for (const patch of [{transaction_amount: 1}, {collector_id: 999}, {live_mode: true}]) assert.ok((await pay(id, patch)).exception);
  assert.equal((await read(`payment_operations/${id}`)).status, 'pending');
  assert.equal((await db.collection('professional_obligations').get()).size, 0);
  assert.equal((await db.collection('admin_tasks').where('kind', '==', 'exception').get()).size, 3);
});
test('expiry and late approval serialize without reclaiming the released or reallocated slot', async () => {
  const id = await reservation(); await due(id);
  await Promise.all([expireOperation(db, id), pay(id)]);
  assert.equal((await read(`payment_operations/${id}`)).status, 'refund_review');
  assert.equal((await read(`citas/${id}`)).estado, 'cancelada');
  assert.equal((await read('therapist_availability/review-ten')).status, 'available');
  await db.doc('therapist_availability/review-ten').update({status: 'booked', appointmentId: 'another-reservation'});
  await pay(id);
  assert.equal((await read('therapist_availability/review-ten')).appointmentId, 'another-reservation');
  assert.equal((await db.collection('professional_obligations').get()).size, 0);
  await syncSource(db, 'payment_operations', id);
  const task = await read(`admin_tasks/${taskId('payment_operations', id)}`);
  assert.equal(task.status, 'open');
});
test('duplicate paid resources are routed to an admin task and cannot replace the first receipt', async () => {
  const id = await reservation(); await pay(id);
  assert.equal((await pay(id, {id: 654321})).exception, 'duplicate_payment');
  assert.equal((await read(`payment_operations/${id}`)).paymentReference, '123456');
  assert.equal((await db.collection('professional_obligations').get()).size, 1);
});
test('refund tasks persist through assignment and blockage; only source resolution closes them', async () => {
  const id = await reservation(); await pay(id);
  await httpCall('B', 'requestPaymentRefundReview', {operationId: id, reason: 'Solicitud sintética'});
  await syncSource(db, 'payment_operations', id);
  const task = taskId('payment_operations', id);
  const update = async (status, who = 'review-admin') => httpCall(who, 'updateAdminTask', {taskId: task, status, note: 'Verificación y evidencia sintética', assignToMe: true, expectedVersion: (await read(`admin_tasks/${task}`)).version});
  await assert.rejects(update('resolved'), {code: 'failed-precondition'});
  await assert.rejects(update('in_progress', 'B'), {code: 'permission-denied'});
  await update('blocked');
  assert.equal((await read(`admin_tasks/${task}`)).assignedTo, 'review-admin');
  await syncSource(db, 'payment_operations', id);
  assert.equal((await read(`admin_tasks/${task}`)).status, 'blocked');
  await pay(id, {status: 'refunded', transaction_amount_refunded: 120});
  await syncSource(db, 'payment_operations', id);
  assert.equal((await read(`admin_tasks/${task}`)).status, 'resolved');
  assert.equal((await read(`professional_obligations/${id}`)).status, 'void');
  await assert.rejects(update('blocked'), {code: 'failed-precondition'});
  const history = await httpCall('review-admin', 'getAdminTaskHistory', {taskId: task});
  assert.ok(history.items.some(entry => entry.action === 'blocked'));
});
test('partial refund and chargeback freeze the obligation and repeated provider states are idempotent', async () => {
  const id = await reservation(); await pay(id);
  await pay(id, {transaction_amount_refunded: 20});
  const count = (await db.collection('payment_audit').get()).size;
  await pay(id, {transaction_amount_refunded: 20});
  assert.equal((await db.collection('payment_audit').get()).size, count);
  assert.equal((await read(`payment_operations/${id}`)).status, 'refund_review');
  assert.equal((await read(`professional_obligations/${id}`)).status, 'refund_review');
  await pay(id, {status: 'charged_back'});
  assert.equal((await read(`payment_operations/${id}`)).refundReason, 'provider_chargeback');
});
test('checkout is server-priced, owns its reservation, expires at the hold deadline and reuses its preference', async () => {
  const id = await reservation(); let calls = 0; let payload;
  const client = {createPreference: async body => {calls++; payload = body; return {id: 'synthetic', collector_id: 123, sandbox_init_point: 'https://sandbox.mercadopago.com.pe/checkout?pref_id=synthetic'};}};
  await assert.rejects(createCheckout(db, 'patient-c', id, config, client), {code: 'permission-denied'});
  const first = await createCheckout(db, 'patient-b', id, config, client);
  assert.equal((await createCheckout(db, 'patient-b', id, config, client)).url, first.url);
  assert.equal(calls, 1); assert.equal(payload.items[0].unit_price, 120); assert.equal(payload.external_reference, id);
  assert.equal(new Date(payload.expiration_date_to).getTime(), (await read(`payment_operations/${id}`)).expiresAt.toMillis());
  await due(id);
  await assert.rejects(createCheckout(db, 'patient-b', id, config, client), {code: 'failed-precondition'});
});
test('durable inbox retries a transient provider error and reconciles successfully on retry', async () => {
  const id = await reservation();
  await db.doc('payment_webhook_inbox/synthetic').set({paymentId: '123456', status: 'pending', attempts: 0, nextAttemptAt: adminFirestore.Timestamp.now()});
  await processInbox(db, 'synthetic', {getPayment: async () => {throw new Error('synthetic outage');}}, config);
  assert.equal((await read('payment_webhook_inbox/synthetic')).status, 'pending');
  await processInbox(db, 'synthetic', {getPayment: async () => approved(id)}, config);
  assert.equal((await read('payment_webhook_inbox/synthetic')).status, 'done');
  assert.equal((await read(`payment_operations/${id}`)).status, 'confirmed');
});
test('scheduled maintenance expires a reservation with payment automation disabled and creates admin checks', async () => {
  const id = await reservation(); await due(id);
  await runPaymentMaintenance(db, null, null);
  assert.equal((await read(`payment_operations/${id}`)).status, 'expired');
  assert.ok((await read('operations_health/payments')).lastRun);
  assert.equal((await db.collection('admin_tasks').where('kind', '==', 'checklist').get()).size, 7);
});
test('review checks reopen when due; stale concurrent administrative decisions are rejected', async () => {
  await ensureChecklist(db);
  const taskId = 'check_budgets'; const task = await read(`admin_tasks/${taskId}`);
  await httpCall('review-admin', 'updateAdminTask', {taskId, status: 'resolved', note: 'Gasto revisado con evidencia sintética', expectedVersion: task.version});
  await assert.rejects(httpCall('review-admin', 'updateAdminTask', {taskId, status: 'blocked', note: 'Versión anterior', expectedVersion: task.version}), {code: 'aborted'});
  await db.doc(`admin_tasks/${taskId}`).update({reviewAt: adminFirestore.Timestamp.fromMillis(Date.now() - 1000)});
  await reopenDueChecklist(db);
  assert.equal((await read(`admin_tasks/${taskId}`)).status, 'open');
});
test('unavailable professionals expose operational appointment data and cancel into refund review', async () => {
  const id = await reservation(); await pay(id);
  await db.doc('therapists/therapist-a').update({activo: false});
  await syncSource(db, 'therapists', 'therapist-a');
  const task = taskId('therapists', 'therapist-a');
  assert.equal((await read(`admin_tasks/${task}`)).status, 'open');
  const page = await httpCall('review-admin', 'getAdminAffectedAppointments', {therapistId: 'therapist-a'});
  assert.ok(page.items.some(item => item.id === id));
  assert.equal(page.items[0].surveySummarySnapshot, undefined);
  await httpCall('review-admin', 'cancelAdminReservation', {appointmentId: id, expectedVersion: (await read(`citas/${id}`)).version, reason: 'Coordinación sintética', requestId: 'ops-admin-cancel'});
  await syncSource(db, 'therapists', 'therapist-a');
  assert.equal((await read(`admin_tasks/${task}`)).status, 'resolved');
  assert.equal((await read(`payment_operations/${id}`)).status, 'refund_review');
});
test('backfill advances its cursor rather than losing records after the first page', async () => {
  const batch = db.batch();
  for (let n = 0; n < 35; n++) batch.set(db.doc(`support_requests/synthetic-${String(n).padStart(2,'0')}`), {status: 'open'});
  await batch.commit(); await bootstrapTasks(db); await bootstrapTasks(db);
  assert.equal((await db.collection('admin_tasks').where('kind', '==', 'support').get()).size, 35);
  assert.equal((await read('operations_health/task_backfill')).support_requestsDone, true);
});
test('admin task rules deny patient reads and every client write; inbox and health remain server-only', async () => {
  await ensureChecklist(db); setLogLevel('silent');
  for (const uid of ['patient-b', 'review-admin']) {
    const client = initializeApp({projectId: 'demo-lurems-followup', apiKey: 'synthetic-only'}, `ops-${uid}`);
    const firestore = getFirestore(client);
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080, {mockUserToken: {sub: uid, user_id: uid}});
    try {
      if (uid === 'patient-b') await assert.rejects(getDoc(doc(firestore, 'admin_tasks/check_budgets')), {code: 'permission-denied'});
      else assert.equal((await getDoc(doc(firestore, 'admin_tasks/check_budgets'))).exists(), true);
      await assert.rejects(setDoc(doc(firestore, 'admin_tasks/forged'), {status: 'resolved'}), {code: 'permission-denied'});
      for (const path of ['payment_webhook_inbox/synthetic', 'operations_health/payments']) await assert.rejects(getDoc(doc(firestore, path)), {code: 'permission-denied'});
    } finally {await terminate(firestore); await deleteApp(client);}
  }
});

test('signed webhook persists before acknowledgement, deduplicates and rejects tampered resources', async () => {
  const secret = 'synthetic-only'; const ts = String(Date.now()); const requestId = 'synthetic-webhook';
  const signature = `ts=${ts},v1=${createHmac('sha256', secret).update(`id:123456;request-id:${requestId};ts:${ts};`).digest('hex')}`;
  const response = {code: 0, status(code) {this.code = code; return this;}, end() {return this.code;}};
  const req = {method: 'POST', query: {'data.id': '123456', type: 'payment'}, body: {data: {id: 123456}}, get: name => name === 'x-request-id' ? requestId : signature};
  assert.equal(await ingestPaymentNotification(req, response, {db, secret, config}), 200);
  assert.equal(await ingestPaymentNotification(req, response, {db, secret, config}), 200);
  assert.equal((await db.collection('payment_webhook_inbox').get()).size, 1);
  assert.equal(await ingestPaymentNotification({...req, query: {'data.id': '654321', type: 'payment'}}, response, {db, secret, config}), 401);
  assert.equal(await ingestPaymentNotification({...req, body: {data: {id: 654321}}}, response, {db, secret, config}), 400);
});
test('owner refresh releases only an elapsed own hold and denies another patient', async () => {
  const id = await reservation();
  await assert.rejects(httpCall('C', 'refreshOwnPaymentReservation', {operationId: id}), {code: 'permission-denied'});
  await httpCall('B', 'refreshOwnPaymentReservation', {operationId: id});
  assert.equal((await read(`payment_operations/${id}`)).status, 'pending');
  await due(id); await httpCall('B', 'refreshOwnPaymentReservation', {operationId: id});
  assert.equal((await read(`payment_operations/${id}`)).status, 'expired');
});
test('refund after professional transfer creates recovery task until externally recovered amounts are recorded', async () => {
  const id = await reservation(); await pay(id);
  await httpCall('review-admin', 'recordProfessionalTransfer', {operationId: id, amountMinor: 8400, currency: 'PEN', transferReference: 'synthetic-transfer'});
  await pay(id, {status: 'refunded', transaction_amount_refunded: 120});
  await syncSource(db, 'professional_obligations', id);
  const task = taskId('professional_obligations', id);
  assert.equal((await read(`admin_tasks/${task}`)).status, 'open');
  const first = {operationId: id, amountMinor: 1000, currency: 'PEN', transferReference: 'synthetic-recovery-one'};
  await httpCall('review-admin', 'recordProfessionalRecovery', first);
  await httpCall('review-admin', 'recordProfessionalRecovery', first);
  assert.equal((await read(`professional_obligations/${id}`)).recoveryReviewMinor, 7400);
  await assert.rejects(httpCall('B', 'recordProfessionalRecovery', {...first, transferReference: 'forged'}), {code: 'permission-denied'});
  await httpCall('review-admin', 'recordProfessionalRecovery', {...first, amountMinor: 7400, transferReference: 'synthetic-recovery-two'});
  await syncSource(db, 'professional_obligations', id);
  assert.equal((await read(`admin_tasks/${task}`)).status, 'resolved');
  assert.equal((await read(`professional_obligations/${id}`)).recoveredMinor, 8400);
});
test('administrative cancellation rejects patients, stale versions and attempts to modify attendance', async () => {
  const id = await reservation();
  const request = {appointmentId: id, expectedVersion: (await read(`citas/${id}`)).version, reason: 'Coordinación sintética', requestId: 'admin-operational-only'};
  await assert.rejects(httpCall('B', 'cancelAdminReservation', request), {code: 'permission-denied'});
  await assert.rejects(httpCall('review-admin', 'cancelAdminReservation', {...request, expectedVersion: 0}), {code: 'aborted'});
  await assert.rejects(httpCall('review-admin', 'cancelAdminReservation', {...request, sessionAction: 'complete'}), {code: 'failed-precondition'});
  const result = await httpCall('review-admin', 'cancelAdminReservation', request);
  assert.deepEqual(result, {appointmentId: id, status: 'cancelada'});
});
test('delayed source snapshots cannot reopen a task already resolved by a newer source snapshot', async () => {
  const {putTask} = require('../functions/src/operations/adminTasks');
  const at = value => adminFirestore.Timestamp.fromMillis(value);
  const spec = {kind:'payment', title:'Revisar pago sintético', description:'Fuente sintética', sourceId:'ordered-source', sourceRoute:'/admin/conciliacion', priority:'high'};
  await putTask(db, 'ordered-source', {...spec, sourceReadAt:at(2000)}, true);
  await putTask(db, 'ordered-source', {...spec, sourceReadAt:at(3000)}, false);
  await putTask(db, 'ordered-source', {...spec, sourceReadAt:at(2500)}, true);
  assert.equal((await read('admin_tasks/ordered-source')).status, 'resolved');
  assert.equal((await db.collection('admin_tasks/ordered-source/history').get()).size, 2);
  await putTask(db, 'ordered-source', {...spec, sourceReadAt:at(4000)}, true);
  assert.equal((await read('admin_tasks/ordered-source')).status, 'open');
});
