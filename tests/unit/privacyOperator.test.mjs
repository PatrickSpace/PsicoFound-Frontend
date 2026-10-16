import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preparePrivacyRequest,runPrivacyRequest} from '../../scripts/privacy-operator.mjs';
const plan={projectId:'demo-lurems-followup',region:'southamerica-east1',emulator:true,operation:'diagnoseAccountDeletion',data:{uid:'patient-b'}};
test('privacy command fixes callable destinations and cannot substitute arbitrary URLs or ordinary admin operations',()=>{
 const request=preparePrivacyRequest({...plan,url:'https://example.test'}, {idToken:'synthetic-token'});
 assert.equal(request.url,'http://127.0.0.1:5001/demo-lurems-followup/southamerica-east1/diagnoseAccountDeletion');
 for(const change of [{operation:'updateUserByAdmin'},{projectId:'real-project'},{region:'other'},{emulator:false}])assert.throws(()=>preparePrivacyRequest({...plan,...change},{idToken:'synthetic-token'}));
 assert.throws(()=>preparePrivacyRequest(plan,{}));
 const remote=preparePrivacyRequest({...plan,emulator:false,projectId:'authorized-staging',environmentAuthorization:'synthetic-reference'},{idToken:'token',appCheckToken:'app-check'});
 assert.equal(remote.options.headers['X-Firebase-AppCheck'],'app-check');
});
test('privacy command returns server results without exposing credentials and never retries uncertain execution',async()=>{
 let count=0;const result=await runPrivacyRequest(plan,{idToken:'private-token'},async()=>{count++;return {ok:true,json:async()=>({result:{jobId:'synthetic-job',status:'diagnosed'}})};});
 assert.equal(count,1);assert.equal(result.jobId,'synthetic-job');assert.equal(JSON.stringify(result).includes('private-token'),false);
 await assert.rejects(runPrivacyRequest(plan,{idToken:'private-token'},async()=>{count++;return {ok:false,json:async()=>({error:{message:'Requiere operador de privacidad'}})};}),/Requiere operador/);assert.equal(count,2);
});
