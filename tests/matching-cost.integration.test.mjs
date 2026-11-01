import {after, test} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {adminApps, adminFirestore} from "./helpers/admin-sdk.mjs";
import {seedPatient, httpCall} from "./helpers/patient-http.mjs";
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const {profileFingerprint} = require("../functions/src/onboarding/professionalSetup");
let app;
after(async () => { if (app) await adminApps.deleteApp(app); });

test("public matching ranks the complete catalogue and preserves response fields and exact legacy slot counts", async () => {
  app = await seedPatient();
  const db = adminFirestore.getFirestore(app);
  const batch = db.batch();
  batch.set(db.doc("payment_rates/cost-shared"), {active: true, isTest: false,
    amountMinor: 10000, paymentUrl: "https://example.test/synthetic"});
  for (let i = 0; i < 30; i++) {
    const id = `cost-${String(i).padStart(2, "0")}`;
    const profile = {nombre: `Profesional ${id}`, uid: id, setupVersion: 1,
      description: "Synthetic profile", licenseNumber: "synthetic", modalidades: ["Remoto"],
      especialidades: i < 20 ? ["Depresion"] : ["Ansiedad"],
      acceptingBookings: true, paymentRateId: "cost-shared"};
    batch.set(db.doc(`therapists/${id}`), {...profile, reviewedProfileFingerprint: profileFingerprint(profile)});
    batch.set(db.doc(`users/${id}`), {accountStatus: "active"});
    for (const [suffix, time] of [["am", "10:00"], ["pm", "14:00"]]) {
      // Existing wall-field-only documents must continue participating.
      batch.set(db.doc(`therapist_availability/${id}-${suffix}`), {therapistId: id,
        status: "available", modality: "Remoto", date: "2099-01-01", startTime: time});
    }
  }
  await batch.commit();
  const result = await httpCall("B", "getRecommendedTherapists", {});
  assert.equal(result.outcome, "ok");
  assert.equal(result.profile.summaryConfirmed, true);
  assert.deepEqual(result.requiredCriteria, []);
  assert.deepEqual(result.therapists.map((p) => p.id), ["cost-20", "cost-21", "cost-22", "cost-23", "cost-24"]);
  assert.ok(result.therapists.every((p) => p.availableSlots === 2));
  assert.deepEqual(Object.keys(result.therapists[0]).sort(), ["id", "nombre", "avatar", "description", "mensaje",
    "direccion", "especialidades", "enfoques", "genero", "edad", "modalidades", "modalidad", "gradient", "activo",
    "matchDetails", "matchQuality", "availableSlots"].sort());
});

test("public matching continues beyond the first five when slots, owners or prices become unavailable", async () => {
  const db = adminFirestore.getFirestore(app);
  await db.doc("therapist_availability/cost-20-am").update({status: "reserved"});
  await db.doc("therapist_availability/cost-20-pm").update({status: "reserved"});
  await db.doc("users/cost-21").update({accountStatus: "suspended"});
  await db.doc("payment_rates/cost-unavailable").set({active: false});
  await db.doc("therapists/cost-22").update({paymentRateId: "cost-unavailable"});
  await db.doc("therapist_availability/cost-23-am").update({modality: "Presencial"});
  await db.doc("therapist_availability/cost-23-pm").update({modality: "Presencial"});
  await db.doc("therapists/cost-24").update({uid: "missing-owner"});
  const result = await httpCall("B", "getRecommendedTherapists", {});
  assert.equal(result.outcome, "ok");
  assert.deepEqual(result.therapists.map((p) => p.id), ["cost-25", "cost-26", "cost-27", "cost-28", "cost-29"]);
  assert.ok(result.therapists.every((p) => p.availableSlots === 2));
});
