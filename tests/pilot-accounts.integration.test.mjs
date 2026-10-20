import { adminApps, adminAuth, adminFirestore } from "./helpers/admin-sdk.mjs";
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { httpCall, seedPatient } from "./helpers/patient-http.mjs";
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const { Timestamp } = require("firebase-admin/firestore");
let app, db;
beforeEach(async () => { app = await seedPatient(); db = adminFirestore.getFirestore(app); });
after(async () => { await (app && adminApps.deleteApp(app)); });
const denied = {code: "permission-denied"};
const failed = {code: "failed-precondition"};
const consent = {legalAccepted: true, legalVersion: "review-2026-10-06",
  termsUrl: "https://example.test/terms", privacyUrl: "https://example.test/privacy"};

test("A-01/02: direct chat/matching/reset blocked for legacy consent, minor and unverified account", async () => {
  for (const fields of [{legalAcceptance: null}, {fechaNacimiento: "2020-01-01"}, {patientOnboardingStatus: "pending"}]) {
    await seedPatient(); await db.doc("users/patient-b").update(fields);
    for (const name of ["startProfileChatConversation", "sendProfileChatMessage", "getRecommendedTherapists", "resetProfileChatConversation", "updateProfilePreferences", "getBookingQuote", "reserveAppointment"]) {
      await assert.rejects(httpCall("B", name, {message: "hola", requestId: "direct-bypass", profile: {modalidad: "remoto"}}), failed);
    }
  }
  await seedPatient(); await adminAuth.getAuth(app).updateUser("patient-b", {emailVerified: false});
  assert.equal((await httpCall("B", "getAccountAccessStatus", {})).reason, "verification_required");
  await assert.rejects(httpCall("B", "completePatientOnboarding", {nombre: "Paciente", fechaNacimiento: "1990-01-01", pais: "Perú", zonaHoraria: "America/Lima"}), failed);
});
test("A-02/03: consent renewal persists once and export includes owned nested data without other patients or credentials", async () => {
  await db.doc("users/patient-b").update({legalAcceptance: null});
  await assert.rejects(httpCall("B", "acceptCurrentConsent", {...consent, legalVersion: "old"}), failed);
  await Promise.all([httpCall("B", "acceptCurrentConsent", consent), httpCall("B", "acceptCurrentConsent", consent)]);
  assert.equal((await db.collection("users/patient-b/consents").get()).size, 1);
  await db.doc("therapy_goals/goal-b-old/progress/1").set({note: "OWN-PROGRESS"});
  await db.doc("therapy_goals/goal-c-old/progress/1").set({note: "OTHER-PATIENT-SECRET"});
  await db.doc("conversations/patient-b/messages/1").set({text: "OWN-MESSAGE"});
  const result = await httpCall("B", "exportOwnData", {}), serialized = JSON.stringify(result);
  assert.ok(serialized.includes("OWN-PROGRESS") && serialized.includes("OWN-MESSAGE"));
  assert.equal(serialized.includes("OTHER-PATIENT-SECRET"), false);
  assert.equal(result.data.authentication.email, "patient-b@example.test");
  assert.equal(result.data.consents.length, 1);
  for (const key of ["passwordHash", "refreshToken", "customClaims"]) assert.equal(serialized.includes(key), false);
});
test("A-04: email synchronization trusts verified Auth, never client email or an unverified token", async () => {
  await db.doc("users/patient-b").update({email: "stale@example.test"});
  const result = await httpCall("B", "syncOwnAuthEmail", {email: "forged@example.test"});
  assert.equal(result.email, "patient-b@example.test");
  assert.equal((await db.doc("users/patient-b").get()).data().email, result.email);
  await adminAuth.getAuth(app).updateUser("patient-b", {emailVerified: false});
  await assert.rejects(httpCall("B", "syncOwnAuthEmail", {}), failed);
});
test("A-05: authorized synthetic deletion requires diagnosis and maintenance; retries are idempotent and shared records remain", async () => {
  await httpCall("B", "requestAccountDeletion", {confirmation: "ELIMINAR MI CUENTA"});
  await assert.rejects(httpCall("review-admin", "diagnoseAccountDeletion", {uid: "patient-b"}), denied);
  await adminAuth.getAuth(app).setCustomUserClaims("review-admin", {privacyOperator: true});
  await db.doc("conversations/patient-b/messages/1").set({text: "DELETE-SYNTHETIC"});
  const ledger = ["payment_receipts/privacy-receipt", "professional_transfers/privacy-transfer"];
  await db.doc("payment_operations/privacy-payment").set({patientUid: "patient-b"});
  for (const path of ledger) await db.doc(path).set({operationId: "privacy-payment", amountMinor: 100});
  const job = await httpCall("review-admin", "diagnoseAccountDeletion", {uid: "patient-b"});
  assert.deepEqual(job.blockers, []);
  const manifest = (await db.collection(`privacy_jobs/${job.jobId}/items`).get()).docs.map(doc => doc.data());
  for (const path of ledger) assert.equal(manifest.find(item => item.path === path)?.action, "retain");
  await assert.rejects(httpCall("review-admin", "executeAccountDeletion", {jobId: job.jobId}), failed);
  await httpCall("review-admin", "authorizeAccountDeletion", {...job, authorizationReference: "synthetic-case-1"});
  await assert.rejects(httpCall("review-admin", "executeAccountDeletion", {jobId: job.jobId}), failed);
  await db.doc("runtime_controls/maintenance").set({enabled: true, startedAt: Timestamp.fromMillis(Date.now() - 240000)});
  await assert.rejects(httpCall("C", "createSupportRequest", {message: "blocked"}), {code: "unavailable"});
  assert.equal((await httpCall("review-admin", "executeAccountDeletion", {jobId: job.jobId})).status, "completed");
  assert.equal((await httpCall("review-admin", "executeAccountDeletion", {jobId: job.jobId})).status, "completed");
  assert.equal((await db.doc("users/patient-b").get()).exists, false);
  assert.equal((await db.doc("conversations/patient-b/messages/1").get()).exists, false);
  assert.equal((await db.doc("terapias/b-active").get()).exists, true);
  assert.equal((await db.doc("users/patient-c").get()).exists, true);
  for (const path of ledger) assert.equal((await db.doc(path).get()).data().amountMinor, 100);
  await assert.rejects(adminAuth.getAuth(app).getUser("patient-b"), {code: "auth/user-not-found"});
  assert.equal((await db.doc("account_requests/patient-b_deletion").get()).data().status, "completed_under_policy");
});
test("A-05: interrupted batches persist a cursor and refuse changed records without deleting them", async () => {
  await httpCall("B", "requestAccountDeletion", {confirmation: "ELIMINAR MI CUENTA"});
  await adminAuth.getAuth(app).setCustomUserClaims("review-admin", {privacyOperator: true});
  const batch = db.batch();
  for (let i = 0; i < 120; i++) batch.set(db.doc(`conversations/patient-b/messages/${String(i).padStart(3, "0")}`), {text: "SYNTHETIC"});
  await batch.commit();
  const job = await httpCall("review-admin", "diagnoseAccountDeletion", {uid: "patient-b"});
  await httpCall("review-admin", "authorizeAccountDeletion", {...job, authorizationReference: "synthetic-partial"});
  await db.doc("runtime_controls/maintenance").set({enabled: true, startedAt: Timestamp.fromMillis(Date.now() - 240000)});
  const first = await httpCall("review-admin", "executeAccountDeletion", {jobId: job.jobId});
  assert.equal(first.status, "partial"); assert.equal(first.processed, 100);
  await db.doc("conversations/patient-b/messages/119").update({text: "CHANGED-AFTER-DIAGNOSIS"});
  await assert.rejects(httpCall("review-admin", "executeAccountDeletion", {jobId: job.jobId}), failed);
  assert.equal((await db.doc("conversations/patient-b/messages/119").get()).data().text, "CHANGED-AFTER-DIAGNOSIS");
  assert.equal((await db.doc(`privacy_jobs/${job.jobId}`).get()).data().cursor, 100);
  const replacement = await httpCall("review-admin", "diagnoseAccountDeletion", {uid: "patient-b"});
  await httpCall("review-admin", "authorizeAccountDeletion", {...replacement, authorizationReference: "synthetic-rediagnosis"});
  assert.equal((await httpCall("review-admin", "executeAccountDeletion", {jobId: replacement.jobId})).status, "completed");
});

test("A-04: synthetic password recovery and verified email change use one-time OOB actions", async () => {
  const {initializeApp, deleteApp} = await import('firebase/app');
  const {getAuth, connectAuthEmulator, signInWithEmailAndPassword, sendPasswordResetEmail, confirmPasswordReset,
    verifyBeforeUpdateEmail, applyActionCode, reload, getIdToken} = await import('firebase/auth');
  const {password, projectId} = await import('./helpers/followup-fixtures.mjs');
  const client = initializeApp({projectId,apiKey:'synthetic-only'}, 'account-oob-test');
  const auth = getAuth(client); connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  const email='patient-b@example.test', changed='verified-change@example.test', nextPassword='NewSyntheticOnly-2026!';
  const codes = async () => (await (await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`)).json()).oobCodes;
  try {
    await sendPasswordResetEmail(auth,email);
    const reset=(await codes()).filter(c=>c.email===email && c.requestType==='PASSWORD_RESET').at(-1);
    assert.ok(reset?.oobCode);
    await confirmPasswordReset(auth,reset.oobCode,nextPassword);
    await assert.rejects(confirmPasswordReset(auth,reset.oobCode,nextPassword));
    await assert.rejects(signInWithEmailAndPassword(auth,email,password));
    const {user}=await signInWithEmailAndPassword(auth,email,nextPassword);
    await verifyBeforeUpdateEmail(user,changed);
    assert.equal((await adminAuth.getAuth(app).getUser('patient-b')).email,email);
    const change=(await codes()).filter(c=>c.requestType==='VERIFY_AND_CHANGE_EMAIL' && c.newEmail===changed).at(-1);
    assert.ok(change?.oobCode);
    await applyActionCode(auth,change.oobCode);
    await assert.rejects(applyActionCode(auth,change.oobCode));
    await reload(user);
    assert.equal(user.email,changed); assert.equal(user.emailVerified,true);
    // Provider refresh tokens may be revoked after a security-sensitive change.
    const fresh=await signInWithEmailAndPassword(auth,changed,nextPassword);
    const token=await getIdToken(fresh.user,true);
    const response=await fetch(`http://127.0.0.1:5001/${projectId}/southamerica-east1/syncOwnAuthEmail`, {
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({data:{}})});
    assert.equal(response.ok,true);
    assert.equal((await db.doc('users/patient-b').get()).data().email,changed);
  } finally {
    await deleteApp(client);
    await adminAuth.getAuth(app).updateUser('patient-b',{email,password,emailVerified:true});
  }
});

test("A-05: blocked deletion request rejects old authenticated access after maintenance", async () => {
  const {initializeApp,deleteApp}=await import('firebase/app');
  const {getFirestore,connectFirestoreEmulator,doc,getDoc,terminate}=await import('firebase/firestore');
  const client=initializeApp({projectId:'demo-lurems-followup',apiKey:'synthetic'},'retained-denial');
  const store=getFirestore(client);
  connectFirestoreEmulator(store,'127.0.0.1',8080,{mockUserToken:{sub:'patient-b',user_id:'patient-b'}});
  await db.doc('account_requests/patient-b_deletion').set({requesterUid:'patient-b',status:'completed_under_policy',accessBlocked:true});
  try {
    await assert.rejects(httpCall('B','exportOwnData',{}),denied);
    await assert.rejects(getDoc(doc(store,'terapias/b-active')),denied);
  } finally { await terminate(store); await deleteApp(client); }
});

test('A-03: professional export includes own ledger without counterparty identity or another professional',async()=>{
  await db.doc('professional_obligations/export-own').set({therapistId:'therapist-a',patientUid:'DO-NOT-EXPORT-COUNTERPARTY',calculatedMinor:8400,pendingMinor:4400,paidMinor:4000});
  await db.doc('professional_transfers/export-own').set({therapistId:'therapist-a',recordedBy:'DO-NOT-EXPORT-OPERATOR',amountMinor:4000});
  await db.doc('professional_obligations/export-other').set({therapistId:'therapist-d',calculatedMinor:1,privateNote:'OTHER-PROFESSIONAL'});
  const result=await httpCall('A','exportOwnData',{});
  assert.equal(result.data.professionalFinancials[0].obligations[0].paidMinor,4000);
  const text=JSON.stringify(result.data.professionalFinancials);
  for(const forbidden of ['DO-NOT-EXPORT-COUNTERPARTY','DO-NOT-EXPORT-OPERATOR','OTHER-PROFESSIONAL'])assert.equal(text.includes(forbidden),false);
});

test('A-05: professional diagnosis includes linked receipts and blocks missing shared retention policy', async () => {
  await httpCall('A', 'requestAccountDeletion', {confirmation: 'ELIMINAR MI CUENTA'});
  await adminAuth.getAuth(app).setCustomUserClaims('review-admin', {privacyOperator: true});
  await db.doc('payment_operations/professional-ledger').set({patientUid: 'patient-b', therapistId: 'therapist-a'});
  await db.doc('payment_receipts/professional-receipt').set({operationId: 'professional-ledger', reference: 'SYNTHETIC-PRIVATE-RECEIPT'});
  const job = await httpCall('review-admin', 'diagnoseAccountDeletion', {uid: 'professional-a'});
  assert.ok(job.blockers.includes('missing_policy:professional_shared/payment_receipts'));
  const manifest = (await db.collection(`privacy_jobs/${job.jobId}/items`).get()).docs.map(doc => doc.data());
  const receipt = manifest.find(item => item.path === 'payment_receipts/professional-receipt');
  assert.equal(receipt.category, 'professional_shared/payment_receipts');
  assert.equal(receipt.action, 'pending_policy');
  assert.equal(JSON.stringify(manifest).includes('SYNTHETIC-PRIVATE-RECEIPT'), false);
  await assert.rejects(httpCall('review-admin', 'authorizeAccountDeletion', {...job, authorizationReference: 'synthetic-blocked'}), failed);
  assert.equal((await db.doc(receipt.path).get()).exists, true);
});
