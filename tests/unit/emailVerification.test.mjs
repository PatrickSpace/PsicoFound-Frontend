import test from 'node:test';
import assert from 'node:assert/strict';
import {verificationActionSettings,verificationResendSeconds} from '../../src/utils/emailVerification.js';
test('verification return URLs stay on an approved HTTPS origin',()=>{
 for(const origin of ['https://app.lurems.lat','https://psico-found-frontend.vercel.app','https://luremsapp.web.app']){
  const config=verificationActionSettings(origin);const url=new URL(config.url);
  assert.equal(url.origin,origin);assert.equal(url.pathname,'/verificar-correo');assert.equal(url.searchParams.get('redirect'),'/onboarding');assert.equal(config.handleCodeInApp,false);
 }
});
test('verification links reject lookalike domains, credentials, alternate ports and insecure production origins',()=>{
 for(const origin of ['https://app.lurems.lat.attacker.test','https://attacker.test','https://user:pass@app.lurems.lat','http://app.lurems.lat','https://app.lurems.lat:8443','javascript:alert(1)','http://localhost:5178']){
  assert.equal(new URL(verificationActionSettings(origin).url).origin,'https://app.lurems.lat');
 }
});
test('only demo validation can use a local HTTP return URL',()=>{
 assert.equal(new URL(verificationActionSettings('http://127.0.0.1:5178',true).url).origin,'http://127.0.0.1:5178');
 assert.equal(new URL(verificationActionSettings('http://attacker.test',true).url).origin,'https://app.lurems.lat');
});
test('resend cooldown ends at sixty seconds and ignores invalid or future storage timestamps',()=>{
 const now=100000;
 assert.equal(verificationResendSeconds(now,now),60);
 assert.equal(verificationResendSeconds(now-59999,now),1);
 assert.equal(verificationResendSeconds(now-60000,now),0);
 for(const value of [0,NaN,'invalid',now+1])assert.equal(verificationResendSeconds(value,now),0);
});
