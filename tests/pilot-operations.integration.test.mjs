import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {adminApps,adminFirestore} from './helpers/admin-sdk.mjs';
import {seedPatient} from './helpers/patient-http.mjs';
let app,restore;
after(async()=>{if(restore) await adminApps.deleteApp(restore);if(app) await adminApps.deleteApp(app);});
// Rehearsal codec only; never substitute for a managed production backup.
function encode(value) {
  if(value instanceof adminFirestore.Timestamp) return {__type:'Timestamp',seconds:value.seconds,nanoseconds:value.nanoseconds};
  if(Array.isArray(value))return value.map(encode);
  if(value && typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,encode(value[key])]));
  return value;
}
function decode(value) {
  if(value?.__type==='Timestamp')return new adminFirestore.Timestamp(value.seconds,value.nanoseconds);
  if(Array.isArray(value))return value.map(decode);
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decode(v)]));
  return value;
}
async function dump(db) {
  const rows=[];
  async function walk(collection) {
    for(const doc of (await collection.get()).docs) {
      rows.push({path:doc.ref.path,data:encode(doc.data())});
      for(const child of await doc.ref.listCollections())await walk(child);
    }
  }
  for(const collection of await db.listCollections()) await walk(collection);
  return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
test('E-02: synthetic snapshot restores nested data and timestamps in a separate demo database',async()=>{
  assert.equal(process.env.GCLOUD_PROJECT,'demo-lurems-followup');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
  app=await seedPatient(); const db=adminFirestore.getFirestore(app);
  await db.doc('conversations/patient-b/messages/rehearsal').set({text:'Synthetic restore marker',createdAt:adminFirestore.Timestamp.now()});
  const source=await dump(db);
  restore=adminApps.initializeApp({projectId:'demo-lurems-restore'},'restore-rehearsal');
  const target=adminFirestore.getFirestore(restore);
  const reset=await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-lurems-restore/databases/(default)/documents',{method:'DELETE'});
  assert.equal(reset.ok,true);
  for(let i=0;i<source.length;i+=100) {
    const batch=target.batch(); for(const row of source.slice(i,i+100))batch.set(target.doc(row.path),decode(row.data)); await batch.commit();
  }
  const restored=await dump(target);
  const digest=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  assert.equal(restored.length,source.length); assert.equal(digest(restored),digest(source));
  assert.equal((await target.doc('conversations/patient-b/messages/rehearsal').get()).data().text,'Synthetic restore marker');
  assert.equal((await target.doc('terapias/b-active').get()).data().pacienteUid,'patient-b');
  // Source remains unchanged and available for rollback while target is validated.
  assert.equal(digest(await dump(db)),digest(source));
});
