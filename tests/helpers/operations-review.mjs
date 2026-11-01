import {createRequire} from 'node:module';
import {seedPatient, seedSlots, reserve, httpCall} from './patient-http.mjs';
import {adminFirestore} from './admin-sdk.mjs';
const require = createRequire(import.meta.url);
const {expireOperation} = require('../../functions/src/payments/paymentOperationHandlers');
const {applyProviderPayment} = require('../../functions/src/payments/paymentAutomation');
const {ensureChecklist, syncSource} = require('../../functions/src/operations/adminTasks');
export async function seedOperationsReview() {
  const app = await seedPatient(); const db = adminFirestore.getFirestore(app); await seedSlots(db);
  const expired = (await reserve('review-ten', 'ops-review-expired')).appointmentId;
  await db.doc(`payment_operations/${expired}`).update({expiresAt: adminFirestore.Timestamp.fromMillis(Date.now() - 1000)});
  await expireOperation(db, expired);
  const refund = (await reserve('review-fourteen', 'ops-review-refund')).appointmentId;
  await db.doc(`payment_operations/${refund}`).update({reconciliation: 'automatic', providerAccountId: '123', providerMode: 'test'});
  await applyProviderPayment(db, {id: 777777, external_reference: refund, collector_id: 123, live_mode: false, transaction_amount: 120, currency_id: 'PEN', status: 'approved', date_approved: new Date().toISOString(), transaction_amount_refunded: 0}, {collectorId: '123', mode: 'test'});
  await httpCall('B', 'requestPaymentRefundReview', {operationId: refund, reason: 'Solicitud sintética para revisar la UI administrativa.'});
  await ensureChecklist(db); await syncSource(db, 'payment_operations', refund);
  await syncSource(db, 'professional_obligations', refund);
  await db.doc('therapists/therapist-a').update({activo: false});
  await syncSource(db, 'therapists', 'therapist-a');
  await db.doc('operations_health/payments').set({lastRun: adminFirestore.FieldValue.serverTimestamp()});
}
