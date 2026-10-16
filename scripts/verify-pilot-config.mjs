// Offline only: validates a review manifest, never logs environment values or connects to a cloud project.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require = createRequire(import.meta.url);
const {eligibilityPolicy, legalPolicy} = require('../functions/src/accounts/accessPolicy');
const {privacyPolicy} = require('../functions/src/accounts/privacyHandlers');
const {commercialPolicy} = require('../functions/src/payments/commercialPolicy');
const {assertProviderApproved} = require('../functions/src/ai/providerPolicy');
const {appCheckOptions} = require('../functions/src/operations/appCheckPolicy');
const path = process.argv[2] || 'config/pilot-staging.example.json';
const configuration = JSON.parse(readFileSync(path,'utf8'));
const env = configuration.environment || {};
const checks = [];
function check(id, validate) {
  let valid=false;
  try { valid=Boolean(validate()); } catch { /* Never print input or errors containing config. */ }
  checks.push({id, status:valid?'configured':'pending'});
}
check('explicit-staging-project', () => configuration.projectId && !configuration.projectId.startsWith('demo-') && env.APP_ENV==='staging' && env.GCLOUD_PROJECT===configuration.projectId && env.FUNCTIONS_EMULATOR!=='true');
check('eligibility', () => eligibilityPolicy(env));
check('legal', () => legalPolicy(env));
check('frontend-legal-parity', () => env.VITE_LEGAL_DOCUMENT_VERSION===env.LEGAL_DOCUMENT_VERSION && env.VITE_TERMS_URL===env.LEGAL_TERMS_URL && env.VITE_PRIVACY_URL===env.LEGAL_PRIVACY_URL && legalPolicy(env));
check('privacy', () => privacyPolicy(env));
check('commercial', () => commercialPolicy(env));
check('provider-approvals', () => assertProviderApproved(env));
check('app-check-enforcement', () => appCheckOptions(env).enforceAppCheck && env.VITE_APP_CHECK_SITE_KEY && !env.VITE_APPCHECK_DEBUG_TOKEN);
check('frontend-project', () => env.VITE_FIREBASE_PROJECT_ID===configuration.projectId && env.VITE_USE_FIREBASE_EMULATORS!=='true');
check('quotas', () => { const l=JSON.parse(env.CHAT_LIMITS_JSON); return l.version && Number.isSafeInteger(l.requestsPerDay) && l.requestsPerDay>0 && Number.isSafeInteger(l.globalConcurrency) && l.globalConcurrency>0; });
for (const id of ['authDomains','oauthConsent','appCheckRegistration','functionServiceAccount','secretAccess','billingPaidProject',
  'errorAlert','budgetAlert','incidentOwner','backup','restoreRehearsal','deployedRules','deployedIndexes','deployedFunctions','clinicalReview','commercialApproval']) {
  check(`evidence-${id}`, () => { const e=configuration.consoleEvidence?.[id]; return e?.environment===configuration.projectId && e?.reference && e?.verifiedAt && e?.verifiedBy; });
}
const hashes=Object.fromEntries(['firestore.rules','firestore.indexes.json','functions/package-lock.json','package-lock.json'].map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]));
console.log(JSON.stringify({mode:'offline-review-only',consoleVerifiedByThisTool:false,checks,artifactHashes:hashes},null,2));
process.exitCode=checks.some(c=>c.status==='pending')?1:0;
