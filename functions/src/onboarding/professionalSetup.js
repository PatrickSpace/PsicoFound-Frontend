/* eslint-disable max-len */
const {createHash} = require("node:crypto");
const {HttpsError} = require("firebase-functions/v2/https");
const {assertFutureSlot} = require("../appointments/appointmentDomain");
const {modalityMatches} = require("../matching/modality");

function profileFingerprint(profile = {}) {
  return createHash("sha256").update(JSON.stringify([
    profile.nombre || "", profile.description || "", profile.licenseNumber || "",
    profile.especialidades || [], profile.enfoques || [], profile.modalidades || [], profile.direccion || "",
  ])).digest("hex");
}

function profileComplete(profile = {}) {
  return Boolean(profile.nombre?.trim() && profile.description?.trim() && profile.licenseNumber?.trim() &&
    Array.isArray(profile.especialidades) && profile.especialidades.length &&
    Array.isArray(profile.modalidades) && profile.modalidades.length &&
    (!profile.modalidades.some((item) => /presencial|h[ií]brido/i.test(item)) || profile.direccion?.trim()));
}

function commercialRateReady(rate) {
  return Boolean(rate?.active === true && !rate.isTest && Number.isSafeInteger(rate.amountMinor) && rate.amountMinor > 0 &&
    typeof rate.paymentUrl === "string" && /^https:\/\//.test(rate.paymentUrl));
}

function usableSlots(profile, slots = []) {
  return slots.filter((slot) => {
    if (slot.status !== "available" || !slot.modality || !modalityMatches(profile.modalidades || [], slot.modality)) return false;
    try {
      assertFutureSlot(slot);
      return true;
    } catch (_) {
      return false;
    }
  });
}

function receptionAllowed(profile = {}) {
  if (profile.activo === false || profile.acceptingBookings === false) return false;
  // Existing profiles keep their previous operation until their owner explicitly
  // adopts the new setup. New approvals start with acceptance switched off.
  return profile.setupVersion !== 1 || (profile.acceptingBookings === true && profileComplete(profile) &&
    profile.reviewedProfileFingerprint === profileFingerprint(profile));
}

function assertReceptionAllowed(profile) {
  if (!profile || !receptionAllowed(profile)) {
    throw new HttpsError("failed-precondition", "El profesional no está recibiendo nuevas reservas. Elige otro profesional o consulta soporte.");
  }
}

function setupState(profile, rate, slots, user = {}) {
  const complete = profileComplete(profile);
  const reviewed = complete && profile.reviewedProfileFingerprint === profileFingerprint(profile);
  const available = usableSlots(profile, slots).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  const rateReady = commercialRateReady(rate);
  const enabled = receptionAllowed(profile) && user.accountStatus !== "suspended";
  return {
    profile: {nombre: profile.nombre || "", description: profile.description || "", licenseNumber: profile.licenseNumber || "",
      especialidades: profile.especialidades || [], enfoques: profile.enfoques || [], modalidades: profile.modalidades || [], direccion: profile.direccion || ""},
    profileFingerprint: profileFingerprint(profile), profileComplete: complete, reviewed, rateReady,
    activationFingerprint: createHash("sha256").update(JSON.stringify([
      profileFingerprint(profile), profile.paymentRateId || "", profile.paymentRateSelectionVersion || 0,
      rate?.version || 0, rate?.amountMinor || 0, rate?.paymentUrl || "", rate?.active, rate?.isTest,
      available.map((slot) => [slot.date, slot.startTime, slot.modality]),
    ])).digest("hex"),
    rate: rate ? {name: rate.name || "", amountMinor: rate.amountMinor, currency: rate.currency || "PEN",
      psychologistPercent: rate.psychologistPercent, platformPercent: rate.platformPercent, isTest: Boolean(rate.isTest)} : null,
    slots: available.map((slot) => ({date: slot.date || "", startTime: slot.startTime || "", modality: slot.modality || ""})),
    acceptingBookings: enabled, legacy: profile.setupVersion !== 1,
    profileEnabled: profile.activo !== false, accountActive: user.accountStatus !== "suspended",
    completedAt: Boolean(profile.setupCompletedAt), version: profile.bookingSettingsVersion || 0,
    canActivate: complete && reviewed && rateReady && available.length > 0 && profile.activo !== false && user.accountStatus !== "suspended",
    welcomeDismissed: Boolean(profile.setupWelcomeDismissed),
  };
}

module.exports = {profileFingerprint, profileComplete, commercialRateReady, usableSlots, receptionAllowed, assertReceptionAllowed, setupState};
