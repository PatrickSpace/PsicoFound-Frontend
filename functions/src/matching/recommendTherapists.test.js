/* eslint-disable max-len */
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {selectAvailableRecommendations, getReceptionTherapists} = require("./recommendTherapists");
const {findMatchingTherapists} = require("./therapistMatching");
const {profileFingerprint} = require("../onboarding/professionalSetup");

const future = {status: "available", date: "2099-01-01", startTime: "10:00", modality: "Remoto"};
const rate = {active: true, amountMinor: 1000, paymentUrl: "https://pay.test"};
function profile(id, extra = {}) {
  const result = {id, uid: `owner-${id}`, nombre: id, setupVersion: 1, paymentRateId: "shared",
    description: "Description", licenseNumber: "license", especialidades: ["Ansiedad"],
    modalidades: ["Remoto"], acceptingBookings: true, ...extra};
  return {...result, reviewedProfileFingerprint: profileFingerprint(result)};
}
function setup(profiles, {slots = {}, documents = {}} = {}) {
  const reads = [];
  const queries = [];
  return {reads, queries, db: {
    doc: (path) => ({get: async () => {
      reads.push(path);
      const data = Object.hasOwn(documents, path) ? documents[path] :
        path.startsWith("payment_rates/") ? rate : {accountStatus: "active"};
      return {exists: Boolean(data), data: () => data};
    }}),
    collection: (path) => {
      const filters = [];
      const query = {orderBy: () => query, where: (key, op, value) => {
        filters.push([key, op, value]); return query;
      }, get: async () => {
        queries.push({path, filters});
        if (path === "therapists") return {docs: profiles.map((item) => ({id: item.id, data: () => item}))};
        assert.deepEqual(filters[1], ["status", "==", "available"]);
        assert.equal(filters[0][0], "therapistId");
        const id = filters[0][2];
        return {docs: (slots[id] || []).map((item, i) => ({id: `${id}-${i}`, data: () => item}))};
      }};
      return query;
    },
  }};
}

test("ranks the whole catalogue before selecting five, preserving ties, exact counts and legacy profiles", async () => {
  const profiles = Array.from({length: 30}, (_, i) => profile(`p${i}`, {especialidades: i < 20 ? [] : ["Ansiedad"]}));
  const slots = Object.fromEntries(profiles.map((item) => [item.id, [future, future]]));
  const {db, reads, queries} = setup(profiles, {slots});
  const candidates = await getReceptionTherapists(db);
  const ranked = findMatchingTherapists(candidates, {especialidades: ["Ansiedad"]}, [], candidates.length);
  const result = await selectAvailableRecommendations(db, ranked);
  assert.deepEqual(result.recommendations.map((p) => p.id), ["p20", "p21", "p22", "p23", "p24"]);
  assert.equal(result.availability.get("p20").length, 2);
  assert.equal(reads.filter((p) => p === "payment_rates/shared").length, 1);
  assert.equal(reads.filter((p) => p.startsWith("users/")).length, 5);
  assert.equal(queries.filter((q) => q.path === "therapist_availability").length, 5);
  const legacy = {id: "old", nombre: "Old"};
  const legacyDb = setup([legacy], {slots: {old: [future]}});
  assert.deepEqual(await getReceptionTherapists(legacyDb.db), [legacy]);
  assert.equal((await selectAvailableRecommendations(legacyDb.db, [legacy])).recommendations.length, 1);
  assert.equal(legacyDb.reads.length, 0);
});

test("continues past unavailable, suspended, unpriced and mismatched candidates without a candidate cap", async () => {
  const profiles = Array.from({length: 12}, (_, i) => profile(`p${i}`, {uid: i === 3 ? "owner-p2" : `owner-p${i}`}));
  profiles[1].paymentRateId = "invalid";
  profiles[4].paymentRateId = "test";
  const slots = Object.fromEntries(profiles.map((p) => [p.id, [future]]));
  slots.p0 = [{...future, date: "2020-01-01"}, {...future, startAtIso: "invalid"}];
  slots.p5 = [{...future, modality: "Presencial"}];
  const {db, reads, queries} = setup(profiles, {slots, documents: {
    "users/owner-p2": {accountStatus: "suspended"}, "payment_rates/invalid": {...rate, active: false},
    "payment_rates/test": {...rate, isTest: true},
  }});
  const result = await selectAvailableRecommendations(db, profiles);
  assert.deepEqual(result.recommendations.map((p) => p.id), ["p6", "p7", "p8", "p9", "p10"]);
  assert.equal(reads.filter((p) => p === "users/owner-p2").length, 1);
  assert.equal(queries.length, 7);
  // New requests re-read authoritative data; there is no stale instance cache.
  await selectAvailableRecommendations(db, [profiles[6]]);
  assert.equal(reads.filter((p) => p === "users/owner-p6").length, 2);
});

test("distinguishes no eligible profiles from eligible profiles without future slots", async () => {
  const candidate = profile("one");
  const {db} = setup([candidate]);
  assert.equal((await selectAvailableRecommendations(db, [candidate])).hasEligible, true);
  assert.equal((await selectAvailableRecommendations(db, [{...candidate, uid: ""}])).hasEligible, false);
  assert.equal((await selectAvailableRecommendations(db, [])).hasEligible, false);
});


test("audit planning fixture of 100 professionals and 2000 slots reads only the winning schedules", async () => {
  const profiles = Array.from({length: 100}, (_, i) => profile(`p${i}`));
  const slots = Object.fromEntries(profiles.map((p) => [p.id, Array.from({length: 20}, () => future)]));
  const {db, reads, queries} = setup(profiles, {slots});
  const all = await getReceptionTherapists(db);
  const result = await selectAvailableRecommendations(db, findMatchingTherapists(all, {}, [], all.length));
  const readCount = all.length + reads.length + [...result.availability.values()].reduce((n, items) => n + items.length, 0);
  assert.equal(readCount, 206); // 100 profiles + 5 owners + 1 rate + 100 slots.
  assert.equal(queries.length, 6); // One catalogue query and five schedule queries.
});
