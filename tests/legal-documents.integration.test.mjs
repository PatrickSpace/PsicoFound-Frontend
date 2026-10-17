import {beforeEach,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,deleteDoc,terminate,setLogLevel} from 'firebase/firestore';
import {adminAuth,adminFirestore} from './helpers/admin-sdk.mjs';
import {seedPatient,httpCall} from './helpers/patient-http.mjs';
import {password,projectId} from './helpers/followup-fixtures.mjs';
let db,app;const clients=[];setLogLevel('silent');
const legacyVersion='review-2026-10-06';
const data=(id='legal-one',version='legal-v1')=>({id,version,termsText:'Términos sintéticos para pruebas',privacyText:'Privacidad sintética para pruebas',expectedRevision:0});
const publication=(id='legal-one',revision=1,current=legacyVersion)=>({id,expectedRevision:revision,expectedCurrentVersion:current,confirmReviewed:true,approvalReference:'Revisión sintética local'});
beforeEach(async()=>{app=await seedPatient();db=adminFirestore.getFirestore(app);});
afterEach(async()=>{for(const [a,d] of clients.splice(0)){await terminate(d);await deleteApp(a);}});
function client(uid){const a=initializeApp({projectId,apiKey:'synthetic-only'},`legal-rules-${uid}-${clients.length}`);const d=getFirestore(a);connectFirestoreEmulator(d,'127.0.0.1',8080,uid==='anonymous'?{}:{mockUserToken:{sub:uid,user_id:uid}});clients.push([a,d]);return d;}
const denied={code:'permission-denied'};

test('LEGAL-01 only a current admin can save or publish; direct writes and private draft reads denied',async()=>{
 for(const who of ['B','A']){
  await assert.rejects(httpCall(who,'saveLegalDraft',data()),denied);
  await assert.rejects(httpCall(who,'publishLegalDraft',publication()),denied);
 }
 await httpCall('review-admin','saveLegalDraft',data());
 for(const uid of ['anonymous','patient-b','professional-a','review-admin']){
  const d=client(uid);
  for(const path of ['legal_drafts/legal-one','legal_settings/current','legal_releases/legal-v1']){
   await assert.rejects(setDoc(doc(d,path),{forged:true}),denied);
   await assert.rejects(deleteDoc(doc(d,path)),denied);
  }
  if(uid!=='review-admin')await assert.rejects(getDoc(doc(d,'legal_drafts/legal-one')),denied);
  else assert.equal((await getDoc(doc(d,'legal_drafts/legal-one'))).exists(),true);
 }
 await db.doc('users/review-admin').update({roles:['patient']});
 await assert.rejects(httpCall('review-admin','publishLegalDraft',publication()),denied);
});

test('LEGAL-02 incomplete drafts can be saved; stale saves and incomplete publication cannot overwrite data',async()=>{
 await httpCall('review-admin','saveLegalDraft',{...data(),privacyText:''});
 await assert.rejects(httpCall('review-admin','publishLegalDraft',publication()),{code:'invalid-argument'});
 await assert.rejects(httpCall('review-admin','saveLegalDraft',data()),{code:'aborted'});
 await httpCall('review-admin','saveLegalDraft',{...data(),expectedRevision:1});
 await assert.rejects(httpCall('review-admin','publishLegalDraft',publication()),{code:'aborted'});
 await assert.rejects(httpCall('review-admin','publishLegalDraft',{...publication('legal-one',2),confirmReviewed:false}),{code:'failed-precondition'});
 assert.equal((await db.doc('legal_releases/legal-v1').get()).exists,false);
 assert.equal((await db.doc('legal_drafts/legal-one').get()).data().revision,2);
});

test('LEGAL-03 publishing atomically creates public immutable text and policy; retries do not duplicate audit',async()=>{
 await httpCall('review-admin','saveLegalDraft',data());
 await httpCall('review-admin','publishLegalDraft',publication());
 await httpCall('review-admin','publishLegalDraft',publication());
 const release=(await db.doc('legal_releases/legal-v1').get()).data();
 assert.equal(release.termsText,data().termsText);assert.equal(release.privacyText,data().privacyText);assert.ok(release.publishedAt);
 assert.equal(release.publishedBy,undefined);assert.equal(release.approvalReference,undefined);
 const d=client('anonymous');assert.equal((await getDoc(doc(d,'legal_releases/legal-v1'))).data().version,'legal-v1');
 const policy=(await getDoc(doc(d,'legal_settings/current'))).data();assert.equal(policy.termsUrl,'https://app.lurems.lat/terminos?version=legal-v1');
 assert.equal((await db.collection('admin_audit').where('action','==','legal_version_published').get()).size,1);
 await assert.rejects(httpCall('review-admin','saveLegalDraft',{...data(),expectedRevision:1}),{code:'failed-precondition'});
 await httpCall('review-admin','saveLegalDraft',data('other','legal-v1'));
 await assert.rejects(httpCall('review-admin','publishLegalDraft',publication('other',1,'legal-v1')),{code:'already-exists'});
});

test('LEGAL-04 competing releases require the current version and cannot overwrite historical documents',async()=>{
 await httpCall('review-admin','saveLegalDraft',data());
 await httpCall('review-admin','saveLegalDraft',data('legal-two','legal-v2'));
 const results=await Promise.allSettled([httpCall('review-admin','publishLegalDraft',publication()),httpCall('review-admin','publishLegalDraft',publication('legal-two'))]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(results.find(x=>x.status==='rejected').reason.code,'aborted');
 const current=(await db.doc('legal_settings/current').get()).data().version;
 const remaining=current==='legal-v1'?'legal-two':'legal-one';
 await httpCall('review-admin','publishLegalDraft',publication(remaining,1,current));
 assert.equal((await db.collection('legal_releases').get()).size,2);
 assert.equal((await db.doc(`legal_releases/${current}`).get()).data().version,current);
});

test('LEGAL-05 consent follows published version; stale consent rejected and original acceptance preserved',async()=>{
 await httpCall('review-admin','saveLegalDraft',data());await httpCall('review-admin','publishLegalDraft',publication());
 let status=await httpCall('B','getAccountAccessStatus',{});assert.equal(status.reason,'consent_required');
 const acceptance={legalAccepted:true,legalVersion:status.legal.version,termsUrl:status.legal.termsUrl,privacyUrl:status.legal.privacyUrl};
 await httpCall('B','acceptCurrentConsent',acceptance);
 status=await httpCall('B','getAccountAccessStatus',{});assert.equal(status.allowed,true);
 await httpCall('review-admin','saveLegalDraft',data('legal-two','legal-v2'));await httpCall('review-admin','publishLegalDraft',publication('legal-two',1,'legal-v1'));
 await assert.rejects(httpCall('B','acceptCurrentConsent',acceptance),{code:'failed-precondition'});
 status=await httpCall('B','getAccountAccessStatus',{});assert.equal(status.reason,'consent_required');
 await httpCall('B','acceptCurrentConsent',{legalAccepted:true,legalVersion:status.legal.version,termsUrl:status.legal.termsUrl,privacyUrl:status.legal.privacyUrl});
 assert.equal((await db.doc('users/patient-b/consents/legal-v1').get()).data().termsUrl,acceptance.termsUrl);
 assert.equal((await db.doc('users/patient-b/consents/legal-v2').get()).exists,true);
});

test('LEGAL-06 registration uses the managed policy and public legal documents work for unverified accounts',async()=>{
 await httpCall('review-admin','saveLegalDraft',data());await httpCall('review-admin','publishLegalDraft',publication());
 await adminAuth.getAuth(app).createUser({uid:'legal-new',email:'legal-new@example.test',password,emailVerified:false});
 const policy=(await db.doc('legal_settings/current').get()).data();
 await assert.rejects(httpCall('legal-new','finalizeRegistration',{intent:'patient',legalAccepted:true,legalVersion:legacyVersion,termsUrl:'https://example.test/terms',privacyUrl:'https://example.test/privacy'}),{code:'failed-precondition'});
 await httpCall('legal-new','finalizeRegistration',{intent:'patient',legalAccepted:true,legalVersion:policy.version,termsUrl:policy.termsUrl,privacyUrl:policy.privacyUrl});
 assert.equal((await db.doc('users/legal-new/consents/legal-v1').get()).exists,true);
 const d=client('legal-new');assert.equal((await getDoc(doc(d,'legal_releases/legal-v1'))).data().privacyText,data().privacyText);
});
