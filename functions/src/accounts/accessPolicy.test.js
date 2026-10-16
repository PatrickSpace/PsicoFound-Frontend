/* eslint-disable max-len */
const test = require("node:test");
const assert = require("node:assert/strict");
const {eligibilityPolicy, ageOnDate, assertEligible, evaluateAccess, legalPolicy} = require("./accessPolicy");

const proposed = {version: "synthetic-v1", minimumAge: 18, ageBasis: "declared_birth_date",
  timeZone: "America/Lima", status: "synthetic", approvalReference: "fixture-only"};
const env = {ELIGIBILITY_POLICY_JSON: JSON.stringify(proposed),
  FUNCTIONS_EMULATOR: "true", GCLOUD_PROJECT: "demo-policy"};
const legal = {version: "legal-v1", termsUrl: "https://example.test/terms", privacyUrl: "https://example.test/privacy"};
const user = {patientOnboardingStatus: "complete", fechaNacimiento: "1990-01-01",
  legalAcceptance: {...legal, acceptedAt: "2026-10-09"}};
const auth = {token: {email_verified: true}};

test("eligibility has no default or synthetic production bypass", () => {
  assert.equal(eligibilityPolicy({}), null);
  assert.equal(eligibilityPolicy({...env, FUNCTIONS_EMULATOR: "false"}), null);
  assert.equal(eligibilityPolicy({...env, GCLOUD_PROJECT: "real-project"}), null);
  assert.equal(eligibilityPolicy({...env, ELIGIBILITY_POLICY_JSON: "bad-json"}), null);
  assert.equal(eligibilityPolicy({...env, ELIGIBILITY_POLICY_JSON: JSON.stringify({...proposed, minimumAge: 17})}), null);
  assert.equal(eligibilityPolicy(env).minimumAge, 18);
  assert.throws(() => assertEligible("1990-01-01", "2026-10-09", null),
      (error) => error.details.reason === "eligibility_policy_unavailable");
});

test("declared age boundary and impossible dates cannot bypass server policy", () => {
  const policy = eligibilityPolicy(env);
  assert.equal(ageOnDate("2008-10-09", "2026-10-09"), 18);
  assertEligible("2008-10-09", "2026-10-09", policy);
  for (const date of ["2008-10-10", "2024-02-30", "2999-01-01", "bad"]) {
    assert.throws(() => assertEligible(date, "2026-10-09", policy));
  }
});

test("existing accounts need current documents, verification, onboarding and eligibility", () => {
  const policy = eligibilityPolicy(env);
  assert.equal(evaluateAccess(user, auth, legal, policy).allowed, true);
  assert.equal(evaluateAccess(user, auth, legal, null).reason, "eligibility_policy_unavailable");
  assert.equal(evaluateAccess(user, auth, null, policy).reason, "policy_unavailable");
  assert.equal(evaluateAccess({...user, legalAcceptance: {...legal, version: "old"}}, auth, legal, policy).reason, "consent_required");
  assert.equal(evaluateAccess(user, {}, legal, policy).reason, "verification_required");
  assert.equal(evaluateAccess({...user, patientOnboardingStatus: "pending"}, auth, legal, policy).reason, "onboarding_required");
  assert.equal(evaluateAccess({...user, fechaNacimiento: "2020-01-01"}, auth, legal, policy).reason, "eligibility_required");
  assert.equal(evaluateAccess({...user, accountStatus: "deleting"}, auth, legal, policy).reason, "account_restricted");
});

test("legal configuration rejects missing and placeholder production URLs", () => {
  assert.equal(legalPolicy({}), null);
  assert.equal(legalPolicy({LEGAL_DOCUMENT_VERSION: "v1", LEGAL_TERMS_URL: legal.termsUrl, LEGAL_PRIVACY_URL: legal.privacyUrl}), null);
});
