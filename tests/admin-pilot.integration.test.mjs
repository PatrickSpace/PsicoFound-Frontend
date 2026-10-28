import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,deleteDoc,terminate,setLogLevel} from 'firebase/firestore';
import {adminAuth,adminFirestore} from './helpers/admin-sdk.mjs';
import {seedPatient,httpCall,seedSlots,reserve} from './helpers/patient-http.mjs';
import {password,projectId} from './helpers/followup-fixtures.mjs';
let db,app;const clients=[];
setLogLevel('silent');
beforeEach(async()=>{
 app=await seedPatient();db=adminFirestore.getFirestore(app);
 for(const uid of ['admin-second','privacy-operator']){
  try{await adminAuth.getAuth(app).createUser({uid,email:`${uid}@example.test`,password,emailVerified:true});}catch(e){if(e.code!=='auth/uid-already-exists')throw e;}
  await db.doc(`users/${uid}`).set({nombre:uid,roles:uid==='admin-second'?['admin','patient']:['patient'],rol:uid==='admin-second'?'admin':'patient'});
 }
 await adminAuth.getAuth(app).setCustomUserClaims('privacy-operator',{privacyOperator:true});
});
afterEach(async()=>{for(const [a,d] of clients.splice(0)){await terminate(d);await deleteApp(a);}});
function client(uid){const a=initializeApp({projectId,apiKey:'synthetic-only'},`admin-rules-${uid}-${clients.length}`);const d=getFirestore(a);connectFirestoreEmulator(d,'127.0.0.1',8080,uid==='anonymous'?{}:{mockUserToken:{sub:uid,user_id:uid}});clients.push([a,d]);return d;}
const profile={nombre:'Profesional editado',description:'Resumen sintético',direccion:'Remoto',especialidades:['Ansiedad'],enfoques:['Humanista'],modalidades:['Remoto'],activo:true};
const application={professionalName:'Solicitante sintético',licenseNumber:'DECLARADA-123',country:'Perú',phone:'',yearsExperience:2,specialties:['Ansiedad'],approaches:['Humanista'],modalities:['Remoto'],professionalSummary:'Resumen sintético',motivation:'',practiceLocation:''};
const userEdit=(uid,roles=['patient'],expectedVersion=0)=>({uid,nombre:'Nombre editado',telefono:'',roles,expectedVersion});
async function apply(who='C'){return (await httpCall(who,'submitPsychologistApplication',application)).request.id;}
const denied={code:'permission-denied'};

test('ADMIN-01 direct rules deny anonymous, patient, professional; ordinary admin cannot read clinical content or write sensitive records',async()=>{
 for(const uid of ['anonymous','patient-b','professional-a']){
  const d=client(uid);
  for(const path of ['users/review-admin','admin_audit/unknown','payment_audit/unknown','professional_obligations/unknown'])await assert.rejects(getDoc(doc(d,path)),denied);
 }
 const d=client('review-admin');
 for(const path of ['profiles/patient-b','conversations/patient-b','terapias/b-active','therapy_goals/b-goal','emotional_checkins/check-b'])await assert.rejects(getDoc(doc(d,path)),denied);
 for(const path of ['users/patient-b','therapists/therapist-a','psychologist_requests/forged','payment_operations/forged','professional_transfers/forged']){
  await assert.rejects(setDoc(doc(d,path),{roles:['admin']}),denied);
  await assert.rejects(deleteDoc(doc(d,path)),denied);
 }
 await assert.rejects(httpCall('review-admin','changeTherapyStatus',{mode:'admin',terapiaId:'b-active',status:'cancelado',requestId:'admin-clinical-forbidden'}),denied);
});

test('ADMIN-02 callables reject patient/professional and revoked operator; admin role does not confer privacyOperator',async()=>{
 const id=await apply();
 const calls=[['updateUserByAdmin',userEdit('patient-b')],['updateProfessionalByAdmin',{id:'therapist-a',profile,expectedVersion:0}],['reviewPsychologistApplication',{requestId:id,action:'approve'}],['getAdministrativeAccountRequests',{}],['reviewPaymentOperation',{operationId:'unknown',status:'rejected'}],['expirePaymentReservation',{operationId:'unknown'}],['recordProfessionalTransfer',{operationId:'unknown',transferReference:'synthetic',currency:'PEN',amountMinor:1}],['savePaymentRate',{rateId:'denied-rate',expectedVersion:0,name:'Denied',amountMinor:100,paymentUrl:'https://mpago.la/synthetic',active:true,isTest:true}]];
 for(const who of ['B','A'])for(const [name,data] of calls)await assert.rejects(httpCall(who,name,data),denied);
 await assert.rejects(httpCall('review-admin','diagnoseAccountDeletion',{uid:'patient-b'}),denied);
 await db.doc('users/admin-second').update({roles:['patient'],rol:'patient'});
 await assert.rejects(httpCall('admin-second','updateUserByAdmin',userEdit('patient-b')),denied);
 const response=await fetch(`http://127.0.0.1:5001/${projectId}/southamerica-east1/getAdministrativeAccountRequests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{}})});
 assert.equal(response.status,401);
});

test('ADMIN-03 competing approval/rejection and application retries cannot duplicate profiles or contradict user access',async()=>{
 const submissions=await Promise.allSettled([apply(),apply()]);
 assert.equal(submissions.filter(x=>x.status==='fulfilled').length,1);
 const id=submissions.find(x=>x.status==='fulfilled').value;
 const decisions=await Promise.allSettled([httpCall('review-admin','reviewPsychologistApplication',{requestId:id,action:'approve'}),httpCall('admin-second','reviewPsychologistApplication',{requestId:id,action:'reject',rejectionReason:'Completar información declarada'})]);
 assert.equal(decisions.filter(x=>x.status==='fulfilled').length,1);
 const req=(await db.doc(`psychologist_requests/${id}`).get()).data();const user=(await db.doc('users/patient-c').get()).data();
 const profiles=await db.collection('therapists').where('uid','==','patient-c').get();
 assert.equal(user.professionalAccessStatus,req.status);assert.equal(profiles.size,req.status==='approved'?1:0);assert.equal(user.roles.includes('psychologist'),req.status==='approved');assert.ok(req.reviewedBy);assert.ok(req.reviewedAt);
 await httpCall('review-admin','reviewPsychologistApplication',{requestId:id,action:req.status==='approved'?'approve':'reject',rejectionReason:'Completar información declarada'});
 assert.equal((await db.collection('therapists').where('uid','==','patient-c').get()).size,profiles.size);
 assert.equal((await db.collection('admin_audit').where('targetUid','==','patient-c').get()).size,1);
});

test('ADMIN-04 rejected applicant can resubmit; stale request cannot alter the new application',async()=>{
 const first=await apply();await assert.rejects(httpCall('review-admin','reviewPsychologistApplication',{requestId:first,action:'reject'}),{code:'invalid-argument'});
 await httpCall('review-admin','reviewPsychologistApplication',{requestId:first,action:'reject',rejectionReason:'Falta detalle'});
 const second=await apply();await assert.rejects(httpCall('review-admin','reviewPsychologistApplication',{requestId:first,action:'approve'}),{code:'failed-precondition'});
 await httpCall('review-admin','reviewPsychologistApplication',{requestId:second,action:'approve'});
 const user=(await db.doc('users/patient-c').get()).data();assert.ok(user.roles.includes('patient'));assert.ok(user.roles.includes('psychologist'));assert.equal(user.latestPsychologistRequestId,second);
 assert.equal((await db.collection('therapists').where('uid','==','patient-c').get()).size,1);
});

test('ADMIN-05 sensitive edits preserve Auth and professional qualification, reject stale writes, protect last admin under concurrent self-demotion',async()=>{
 const before=await adminAuth.getAuth(app).getUser('patient-b');
 for(const data of [{...userEdit('patient-b'),email:'other@example.test'},userEdit('patient-b',['patient','psychologist']),userEdit('nonexistent')])await assert.rejects(httpCall('review-admin','updateUserByAdmin',data));
 await httpCall('review-admin','updateUserByAdmin',userEdit('patient-b'));
 await assert.rejects(httpCall('admin-second','updateUserByAdmin',userEdit('patient-b')),{code:'aborted'});
 assert.equal((await adminAuth.getAuth(app).getUser('patient-b')).email,before.email);
 assert.equal((await db.doc('users/patient-b').get()).data().nombre,'Nombre editado');
 const edits=await Promise.allSettled([httpCall('review-admin','updateUserByAdmin',userEdit('review-admin')),httpCall('admin-second','updateUserByAdmin',userEdit('admin-second'))]);
 assert.equal(edits.filter(x=>x.status==='fulfilled').length,1);
 const admins=(await db.collection('users').get()).docs.filter(x=>(x.data().roles||[]).includes('admin'));assert.equal(admins.length,1);
 assert.equal((await db.collection('admin_audit').where('action','==','user_updated').get()).size,2);
});

test('ADMIN-06 professional activation edits are versioned and block professional operations and new booking quotes',async()=>{
 await httpCall('review-admin','updateProfessionalByAdmin',{id:'therapist-a',profile:{...profile,activo:false},expectedVersion:0});
 await assert.rejects(httpCall('admin-second','updateProfessionalByAdmin',{id:'therapist-a',profile,expectedVersion:0}),{code:'aborted'});
 await assert.rejects(httpCall('B','getBookingQuote',{therapistId:'therapist-a'}),{code:'failed-precondition'});
 await assert.rejects(getDoc(doc(client('professional-a'),'terapias/b-active')),denied);
 await httpCall('review-admin','updateProfessionalByAdmin',{id:'therapist-a',profile,expectedVersion:1});
 assert.equal((await httpCall('B','getBookingQuote',{therapistId:'therapist-a'})).amountMinor,12000);
});

test('ADMIN-07 linked late payment support is versioned, idempotent, isolated by owner and never changes financial records',async()=>{
 await seedSlots(db);const id=(await reserve()).appointmentId;await db.doc(`payment_operations/${id}`).update({expiresAt:adminFirestore.Timestamp.fromMillis(Date.now()-1000)});
 const support=await httpCall('B','createSupportRequest',{requestId:'admin-late-payment',category:'error',message:'Pago tardío sintético',paymentOperationId:id});
 const data={supportRequestId:support.id,requestId:'response-1',expectedVersion:0,status:'in_progress',response:'Revisión del comprobante registrada'};
 await assert.rejects(httpCall('B','respondSupportRequest',data),denied);
 const results=await Promise.allSettled([httpCall('review-admin','respondSupportRequest',data),httpCall('admin-second','respondSupportRequest',{...data,requestId:'response-2',response:'Otra decisión'})]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 const first=(await db.doc(`support_requests/${support.id}`).get()).data();const winner=first.responses[0];
 const replay=winner.requestId==='response-1'?data:{...data,requestId:'response-2',response:'Otra decisión'};
 await httpCall(winner.authorUid,'respondSupportRequest',replay);
 await httpCall('review-admin','respondSupportRequest',{...data,requestId:'response-final',expectedVersion:1,status:'resolved',response:'Se registró la solución comercial autorizada del caso ficticio; sin reactivar reserva.'});
 const owner=await getDoc(doc(client('patient-b'),`support_requests/${support.id}`));assert.equal(owner.data().status,'resolved');assert.equal(owner.data().responses.length,2);
 await assert.rejects(getDoc(doc(client('patient-c'),`support_requests/${support.id}`)),denied);
 assert.equal((await db.doc(`payment_operations/${id}`).get()).data().status,'pending');
 assert.equal((await db.collection('notifications').where('type','==','support_updated').get()).size,2);
});

test('ADMIN-08 privacy status exposes blockers without manifests; ordinary admin cannot authorize or execute',async()=>{
 await httpCall('B','requestAccountDeletion',{confirmation:'ELIMINAR MI CUENTA'});
 const diagnosis=await httpCall('privacy-operator','diagnoseAccountDeletion',{uid:'patient-b'});
 const view=await httpCall('review-admin','getAdministrativeAccountRequests',{});
 assert.equal(view.items[0].requesterUid,'patient-b');assert.equal(view.items[0].jobs[0].id,diagnosis.jobId);
 assert.equal(JSON.stringify(view).includes('fingerprint'),false);assert.equal(JSON.stringify(view).includes('conversations/'),false);
 for(const name of ['authorizeAccountDeletion','executeAccountDeletion'])await assert.rejects(httpCall('review-admin',name,{jobId:diagnosis.jobId}),denied);
 await assert.rejects(httpCall('privacy-operator','executeAccountDeletion',{jobId:diagnosis.jobId}));
});

test('ADMIN-09 role revocation removes legacy authority and patient actions; privacy does not bypass administrative membership protection',async()=>{
 await db.doc('users/admin-second').update({role:'admin'});
 await httpCall('review-admin','updateUserByAdmin',userEdit('admin-second'));
 assert.equal((await db.doc('users/admin-second').get()).data().role,undefined);
 await assert.rejects(httpCall('admin-second','expirePaymentReservation',{operationId:'unknown'}),denied);
 await httpCall('review-admin','updateUserByAdmin',userEdit('patient-b',['admin']));
 await assert.rejects(httpCall('B','getBookingQuote',{therapistId:'therapist-a'}),denied);
 await httpCall('B','requestAccountDeletion',{confirmation:'ELIMINAR MI CUENTA'});
 const diagnosis=await httpCall('privacy-operator','diagnoseAccountDeletion',{uid:'patient-b'});
 assert.ok(diagnosis.blockers.includes('admin_role_must_be_removed'));
 await assert.rejects(httpCall('privacy-operator','authorizeAccountDeletion',{jobId:diagnosis.jobId,fingerprint:diagnosis.fingerprint,authorizationReference:'synthetic-authority'}),{code:'failed-precondition'});
});

test('ADMIN-10 changes/deactivation between quote and booking reject stale offers and preserve earlier snapshots',async()=>{
 await seedSlots(db);
 const rate={rateId:'admin-quote-rate',expectedVersion:0,name:'Cotización inicial',amountMinor:13001,paymentUrl:'https://mpago.la/synthetic-quote',active:true,isTest:true};
 await httpCall('review-admin','savePaymentRate',rate);
 await httpCall('A','setPsychologistPaymentRate',{therapistId:'therapist-a',rateId:rate.rateId,expectedRateVersion:1,expectedSelectionVersion:1});
 const id=(await reserve()).appointmentId;const original=(await db.doc(`payment_operations/${id}`).get()).data();
 const quote=await httpCall('C','getBookingQuote',{therapistId:'therapist-a'});
 const booking={terapeutaId:'therapist-a',availabilitySlotId:'review-fourteen',mode:'patient',quoteId:quote.quoteId,requestId:'stale-rate-quote'};
 await httpCall('review-admin','savePaymentRate',{...rate,expectedVersion:1,name:'Cotización revisada'});
 await assert.rejects(httpCall('C','reserveAppointment',booking),{code:'aborted'});
 const current=await httpCall('C','getBookingQuote',{therapistId:'therapist-a'});
 await httpCall('admin-second','savePaymentRate',{...rate,expectedVersion:2,name:'Cotización revisada',active:false});
 await assert.rejects(httpCall('C','reserveAppointment',{...booking,quoteId:current.quoteId}),{code:'failed-precondition'});
 assert.deepEqual((await db.doc(`payment_operations/${id}`).get()).data().rateSnapshot,original.rateSnapshot);
 assert.equal((await db.doc('therapist_availability/review-fourteen').get()).data().status,'available');
});

test('ADMIN-11 manual expiry never releases a slot now owned by another appointment; context contains no clinical fields',async()=>{
 await seedSlots(db);const id=(await reserve()).appointmentId;
 await db.doc(`citas/${id}`).update({notas:'CLINICAL-PRIVATE',sessionSummary:'CLINICAL-SUMMARY'});
 const context=await httpCall('review-admin','getPaymentOperationContext',{operationId:id});
 assert.deepEqual(Object.keys(context).sort(),['id','paymentStatus','scheduleStatus','startAtIso','status']);assert.equal(JSON.stringify(context).includes('CLINICAL'),false);
 await assert.rejects(httpCall('B','getPaymentOperationContext',{operationId:id}),denied);
 await db.doc(`payment_operations/${id}`).update({expiresAt:adminFirestore.Timestamp.fromMillis(Date.now()-1000)});
 await db.doc('therapist_availability/review-ten').update({appointmentId:'another-appointment',bookedBy:'patient-c'});
 await httpCall('review-admin','expirePaymentReservation',{operationId:id});
 assert.equal((await db.doc('therapist_availability/review-ten').get()).data().appointmentId,'another-appointment');
 assert.equal((await db.doc('therapist_availability/review-ten').get()).data().status,'booked');
 assert.equal((await db.doc(`citas/${id}`).get()).data().paymentStatus,'expired');
});

test('ADMIN-12 two operators cannot attach different receipts to the same payment and retries do not duplicate audit',async()=>{
 await seedSlots(db);const id=(await reserve()).appointmentId;await httpCall('B','markPaymentSubmitted',{operationId:id});
 const results=await Promise.allSettled(['review-admin','admin-second'].map((who,index)=>httpCall(who,'reviewPaymentOperation',{operationId:id,status:'confirmed',providerReference:`receipt-${index}`,note:'Verificación sintética'})));
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 const saved=(await db.doc(`payment_operations/${id}`).get()).data();await httpCall('review-admin','reviewPaymentOperation',{operationId:id,status:'confirmed',providerReference:saved.providerReference,note:'Verificación sintética'});
 assert.equal((await db.collection('payment_receipts').get()).size,1);assert.equal((await db.collection('payment_audit').get()).size,1);
});

test('ADMIN-13 transfer racing refund review cannot leave a payable refund; completed transfers remain recoverable',async()=>{
 await seedSlots(db);const id=(await reserve()).appointmentId;await httpCall('B','markPaymentSubmitted',{operationId:id});await httpCall('review-admin','reviewPaymentOperation',{operationId:id,status:'confirmed',providerReference:'transfer-race-payment'});
 await Promise.allSettled([httpCall('admin-second','recordProfessionalTransfer',{operationId:id,transferReference:'race-transfer',amountMinor:1000,currency:'PEN'}),httpCall('B','requestPaymentRefundReview',{operationId:id,reason:'Revisión sintética'})]);
 assert.equal((await db.doc(`payment_operations/${id}`).get()).data().status,'refund_review');
 await assert.rejects(httpCall('review-admin','recordProfessionalTransfer',{operationId:id,transferReference:'late-transfer',amountMinor:1,currency:'PEN'}),{code:'failed-precondition'});
 await httpCall('review-admin','reviewPaymentOperation',{operationId:id,status:'refunded',providerReference:'external-refund-synthetic'});
 const obligation=(await db.doc(`professional_obligations/${id}`).get()).data();assert.equal(obligation.pendingMinor,0);assert.equal(obligation.status,obligation.paidMinor>0?'recovery_review':'void');
});

test('ADMIN-14 reproducible privacy operator command enforces server claims and returns a real local diagnosis',async()=>{
 const {runPrivacyRequest}=await import('../scripts/privacy-operator.mjs');
 await httpCall('B','requestAccountDeletion',{confirmation:'ELIMINAR MI CUENTA'});
 async function session(uid){const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${uid}@example.test`,password,returnSecureToken:true})});return response.json();}
 const plan={projectId,region:'southamerica-east1',emulator:true,operation:'diagnoseAccountDeletion',data:{uid:'patient-b'}};
 await assert.rejects(runPrivacyRequest(plan,await session('review-admin')),/operador de privacidad/);
 const result=await runPrivacyRequest(plan,await session('privacy-operator'));
 assert.equal(result.status,'diagnosed');assert.ok(result.count>0);assert.equal((await db.doc(`privacy_jobs/${result.jobId}`).get()).data().uid,'patient-b');
});

test('ADMIN-15 legacy admin aliases have matching rules and callable permissions and lose both after revocation',async()=>{
 const d=client('admin-second');
 for(const membership of [{role:'admin'},{rol:'psicofound-admin'},{roles:['psicofound-admin']}]){
  await db.doc('users/admin-second').set({nombre:'Operador heredado',...membership});
  assert.ok((await getDoc(doc(d,'users/patient-b'))).exists());
  assert.ok(Array.isArray((await httpCall('admin-second','getAdministrativeAccountRequests',{})).items));
 }
 await httpCall('review-admin','updateUserByAdmin',userEdit('admin-second'));
 await assert.rejects(getDoc(doc(d,'users/patient-b')),denied);
 await assert.rejects(httpCall('admin-second','getAdministrativeAccountRequests',{}),denied);
});

test('ADMIN-16 deleting a former operator requires an explicit shared-audit policy and preserves other users evidence',async()=>{
 await httpCall('admin-second','updateUserByAdmin',userEdit('patient-c'));
 await db.doc('payment_audit/operator-case').set({actorUid:'admin-second',operationId:'someone-elses-payment',status:'confirmed'});
 await db.doc('professional_transfers/operator-case').set({recordedBy:'admin-second',operationId:'someone-elses-payment',amountMinor:100});
 await httpCall('review-admin','updateUserByAdmin',userEdit('admin-second'));
 await httpCall('admin-second','requestAccountDeletion',{confirmation:'ELIMINAR MI CUENTA'});
 const diagnosis=await httpCall('privacy-operator','diagnoseAccountDeletion',{uid:'admin-second'});
 for(const category of ['admin_audit','payment_audit','professional_transfers'])assert.ok(diagnosis.blockers.includes(`missing_policy:administrative_shared/${category}`));
 await assert.rejects(httpCall('privacy-operator','authorizeAccountDeletion',{jobId:diagnosis.jobId,fingerprint:diagnosis.fingerprint,authorizationReference:'synthetic-only'}),{code:'failed-precondition'});
 assert.ok((await db.doc('payment_audit/operator-case').get()).exists);
});


test('ADMIN-18 suspended accounts cannot substitute for the last usable administrator',async()=>{
 await adminAuth.getAuth(app).updateUser('admin-second',{disabled:false});
 await db.doc('users/admin-second').update({accountStatus:'suspended',suspensionType:'voluntary'});
 await assert.rejects(httpCall('review-admin','updateUserByAdmin',userEdit('review-admin')),{code:'failed-precondition'});
 assert.ok((await db.doc('users/review-admin').get()).data().roles.includes('admin'));
 await db.doc('users/admin-second').update({accountStatus:'active'});
 await httpCall('review-admin','updateUserByAdmin',userEdit('review-admin'));
 assert.deepEqual((await db.doc('users/review-admin').get()).data().roles,['patient']);
});

test('ADMIN-17 orphaned or disabled Auth accounts cannot substitute for the last usable administrator',async()=>{
 await httpCall('review-admin','updateUserByAdmin',userEdit('admin-second'));
 await db.doc('users/orphan-admin').set({roles:['admin'],rol:'admin'});
 await db.doc('users/admin-second').update({roles:['admin'],rol:'admin'});
 await adminAuth.getAuth(app).updateUser('admin-second',{disabled:true});
 await assert.rejects(httpCall('review-admin','updateUserByAdmin',userEdit('review-admin')),{code:'failed-precondition'});
 assert.ok((await db.doc('users/review-admin').get()).data().roles.includes('admin'));
 await adminAuth.getAuth(app).updateUser('admin-second',{disabled:false});
 await httpCall('review-admin','updateUserByAdmin',userEdit('review-admin'));
 assert.deepEqual((await db.doc('users/review-admin').get()).data().roles,['patient']);
});
