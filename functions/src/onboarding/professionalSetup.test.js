/* eslint-disable max-len */
const test = require("node:test");
const assert = require("node:assert/strict");
const {profileFingerprint, profileComplete, receptionAllowed, setupState, usableSlots} = require("./professionalSetup");
const profile = {nombre: "Profesional sintético", description: "Presentación", licenseNumber: "QA", especialidades: ["Ansiedad"], modalidades: ["Remoto"], activo: true};
const rate = {active: true, isTest: false, amountMinor: 10000, paymentUrl: "https://mpago.la/synthetic", version: 1};
const slots = [{status: "available", date: "2099-01-02", startTime: "10:00", timeZone: "America/Lima", modality: "Remoto"}];

test("legacy professionals retain operation, explicit pause and admin deactivation always win", () => {
  assert.equal(receptionAllowed(profile), true);
  assert.equal(receptionAllowed({...profile, acceptingBookings: false}), false);
  assert.equal(receptionAllowed({...profile, activo: false}), false);
});
test("new approvals cannot accept bookings until explicitly reviewed and activated", () => {
  assert.equal(receptionAllowed({...profile, setupVersion: 1}), false);
  assert.equal(receptionAllowed({...profile, setupVersion: 1, acceptingBookings: true}), false);
  assert.equal(receptionAllowed({...profile, setupVersion: 1, acceptingBookings: true, reviewedProfileFingerprint: profileFingerprint(profile)}), true);
});
test("essential profile edits invalidate a previous review", () => {
  assert.equal(receptionAllowed({...profile, setupVersion: 1, acceptingBookings: true, reviewedProfileFingerprint: profileFingerprint(profile), modalidades: ["Presencial"]}), false);
  assert.equal(profileComplete({...profile, modalidades: ["Híbrido"]}), false);
  assert.equal(profileComplete({...profile, modalidades: ["Híbrido"], direccion: "Ubicación QA"}), true);
});
test("only future, available and modality compatible slots count", () => {
  assert.equal(usableSlots(profile, [...slots, {...slots[0], status: "booked"}, {...slots[0], date: "2000-01-01"}, {...slots[0], modality: "Presencial"}]).length, 1);
  assert.equal(usableSlots({...profile, modalidades: ["Híbrido"]}, slots).length, 1);
});
test("test rates and suspended accounts cannot complete commercial setup", () => {
  const reviewed = {...profile, reviewedProfileFingerprint: profileFingerprint(profile)};
  assert.equal(setupState(reviewed, rate, slots).canActivate, true);
  assert.equal(setupState(reviewed, {...rate, isTest: true}, slots).canActivate, false);
  assert.equal(setupState(reviewed, {...rate, active: false}, slots).canActivate, false);
  assert.equal(setupState(reviewed, rate, slots, {accountStatus: "suspended"}).canActivate, false);
});
test("activation preview changes when price or available schedule changes", () => {
  const state = setupState(profile, rate, slots);
  assert.notEqual(state.activationFingerprint, setupState(profile, {...rate, amountMinor: 12000}, slots).activationFingerprint);
  assert.notEqual(state.activationFingerprint, setupState(profile, rate, [{...slots[0], startTime: "11:00"}]).activationFingerprint);
});
test("running out of availability preserves the historical completion", () => {
  const state = setupState({...profile, setupCompletedAt: true, acceptingBookings: true, setupVersion: 1, reviewedProfileFingerprint: profileFingerprint(profile)}, rate, []);
  assert.equal(state.completedAt, true);
  assert.equal(state.acceptingBookings, true);
  assert.equal(state.canActivate, false);
  assert.equal(state.slots.length, 0);
});
