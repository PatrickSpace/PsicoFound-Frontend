/* eslint-disable max-len */
const test = require("node:test");
const assert = require("node:assert/strict");
const {privacyPolicy, buildManifest, diagnoseAccountDeletion} = require("./privacyHandlers");
const policy = {version: "synthetic-v1", status: "synthetic", approvalReference: "fixture-only", authentication: "delete",
  storage: "not_used_verified", categories: {account_requests: {action: "retain", basis: "fixture", minimumAgeDays: 0},
    profiles: {action: "delete", basis: "fixture", minimumAgeDays: 30}}};
const env = {FUNCTIONS_EMULATOR: "true", GCLOUD_PROJECT: "demo-privacy", PRIVACY_POLICY_JSON: JSON.stringify(policy)};

test("privacy policy requires explicit retention and excludes synthetic production configuration", () => {
  assert.equal(privacyPolicy({}), null);
  assert.equal(privacyPolicy({...env, FUNCTIONS_EMULATOR: "false"}), null);
  assert.equal(privacyPolicy({...env, GCLOUD_PROJECT: "real"}), null);
  assert.deepEqual(privacyPolicy(env), policy);
  for (const change of [{storage: "unknown"}, {categories: {}}, {categories: {...policy.categories,
    profiles: {action: "delete", minimumAgeDays: -1, basis: "fixture"}}}]) {
    assert.equal(privacyPolicy({...env, PRIVACY_POLICY_JSON: JSON.stringify({...policy, ...change})}), null);
  }
});
test("diagnosis blocks unknown categories, subcollections and unexpired retention; hash tracks versions", () => {
  const record = {category: "profiles", snapshot: {ref: {path: "profiles/synthetic"},
    updateTime: {toMillis: () => 10, seconds: 0, nanoseconds: 10000000},
    data: () => ({createdAt: "2026-10-01T00:00:00Z"})}};
  const inventory = {records: [record], unknown: ["profiles/synthetic/unknown"]};
  const result = buildManifest(inventory, policy, Date.parse("2026-10-09"));
  assert.ok(result.blockers.includes("retention:profiles/synthetic"));
  assert.ok(result.blockers.includes("unknown_subcollection:profiles/synthetic/unknown"));
  assert.ok(buildManifest(inventory, null).blockers.includes("missing_policy:profiles"));
  const later = buildManifest({...inventory, unknown: []}, policy, Date.parse("2026-12-01"));
  assert.deepEqual(later.blockers, []);
  assert.equal(later.fingerprint, result.fingerprint);
  assert.equal(JSON.stringify(result).includes("2026-10-01"), false, "diagnosis does not copy personal contents");
});
test("privacy diagnosis rejects anonymous, ordinary admin and stale operator credentials before data access", async () => {
  for (const request of [{}, {auth: {uid: "a", token: {admin: true}}},
    {auth: {uid: "a", token: {privacyOperator: true, auth_time: 1}}}]) {
    await assert.rejects(diagnoseAccountDeletion(request), (e) => ["unauthenticated", "permission-denied"].includes(e.code));
  }
});
