const firestoreAdmin = require("firebase-admin/firestore");
const {
  receptionAllowed, commercialRateReady, usableSlots,
} = require("../onboarding/professionalSetup");
const {HttpsError} = require("firebase-functions/v2/https");
const {requirePatientAccess} = require("../accounts/accessPolicy");
const {buildSearchCriteriaFromProfile} = require("./criteria");
const {
  findMatchingTherapists,
  getMatchDetails,
} = require("./therapistMatching");
const {
  getCurrentProfile, finalizeProfileForMatching,
} = require("../profiles/profile");
const {assertFutureSlot} = require("../appointments/appointmentDomain");

async function getRecommendedTherapists(request) {
  await requirePatientAccess(request);
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const uid = request.auth.uid;
  const db = firestoreAdmin.getFirestore();
  const profileRef = db.collection("profiles").doc(uid);
  const profile = finalizeProfileForMatching(
      await getCurrentProfile(profileRef),
  );
  if (!profile.completado || !profile.summaryConfirmed) {
    throw new HttpsError(
        "failed-precondition",
        "Revisa y confirma el resumen antes de solicitar recomendaciones.",
    );
  }
  const criteria = buildSearchCriteriaFromProfile(profile);
  const requiredCriteria = [];
  const therapists = await getReceptionTherapists(db);
  const matches = findMatchingTherapists(
      therapists,
      criteria,
      requiredCriteria,
      therapists.length,
  );
  const {recommendations, availability, hasEligible} =
    await selectAvailableRecommendations(db, matches);
  const outcome = recommendations.length ? "ok" :
    hasEligible ? "no_availability" : "no_matches";

  return {
    profile,
    criteria,
    requiredCriteria,
    outcome,
    therapists: recommendations.map((therapist) => {
      const slots = availability.get(therapist.id) || [];
      const matchDetails = getMatchDetails(therapist, criteria);
      return {
        ...sanitizeTherapistForClient(therapist),
        matchDetails,
        matchQuality: matchDetails.differs.length ? "closest" : "exact",
        availableSlots: slots.length,
      };
    }),
  };
}

async function getReceptionTherapists(db) {
  // All profiles participate in the exact same stable ranking. In particular,
  // legacy profiles with missing activo/acceptingBookings remain supported.
  const snapshot = await db.collection("therapists").orderBy("nombre").get();
  return snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}))
      .filter(receptionAllowed);
}

async function selectAvailableRecommendations(db, rankedTherapists) {
  const documents = new Map();
  const read = (path) => {
    if (!documents.has(path)) documents.set(path, db.doc(path).get());
    return documents.get(path);
  };
  const recommendations = [];
  const availability = new Map();
  let hasEligible = false;
  const evaluate = async (therapist) => {
    if (therapist.setupVersion === 1) {
      if (!therapist.paymentRateId || !therapist.uid) return null;
      const [rate, owner] = await Promise.all([
        read(`payment_rates/${therapist.paymentRateId}`),
        read(`users/${therapist.uid}`),
      ]);
      if (!commercialRateReady(rate.data()) || !owner.exists ||
          owner.data().accountStatus === "suspended") return null;
    }
    hasEligible = true;
    return {therapist, slots: await getFutureAvailability(db, therapist)};
  };
  // Rank everything first, then evaluate bounded parallel batches. Each batch
  // is no larger than the remaining result count: no speculative reads beyond
  // the fifth valid recommendation, and no arbitrary candidate cap.
  let offset = 0;
  while (offset < rankedTherapists.length && recommendations.length < 5) {
    const batch = rankedTherapists.slice(
        offset, offset + 5 - recommendations.length,
    );
    const evaluated = await Promise.all(batch.map(evaluate));
    offset += batch.length;
    for (const result of evaluated) {
      if (!result || !result.slots.length) continue;
      availability.set(result.therapist.id, result.slots);
      recommendations.push(result.therapist);
    }
  }
  return {recommendations, availability, hasEligible};
}

async function getFutureAvailability(db, therapist) {
  // Scope reads to a ranked, eligible professional, never the global schedule.
  // Do not filter on startAt yet: historical slots may have only wall fields.
  // The exact count remains part of the public response (availableSlots).
  const snapshot = await db.collection("therapist_availability")
      .where("therapistId", "==", therapist.id)
      .where("status", "==", "available").get();
  return snapshot.docs.filter((doc) => {
    const slot = doc.data();
    if (therapist.setupVersion === 1 &&
        !usableSlots(therapist, [slot]).length) return false;
    try {
      assertFutureSlot(slot);
      return true;
    } catch (_) {
      return false;
    }
  }).map((doc) => doc.id);
}

function normalizeRequiredCriteria() {
  return [];
}

function sanitizeTherapistForClient(therapist = {}) {
  return {
    id: therapist.id || "",
    nombre: therapist.nombre || "",
    avatar: therapist.avatar || "",
    description: therapist.description || "",
    mensaje: therapist.mensaje || "",
    direccion: therapist.direccion || "",
    especialidades: Array.isArray(therapist.especialidades) ?
      therapist.especialidades :
      [],
    enfoques: Array.isArray(therapist.enfoques) ? therapist.enfoques : [],
    genero: therapist.genero || "",
    edad: therapist.edad ? Number(therapist.edad) : null,
    modalidades: Array.isArray(therapist.modalidades) ?
      therapist.modalidades :
      [],
    modalidad: therapist.modalidad || "",
    gradient: therapist.gradient || "",
    activo: typeof therapist.activo === "boolean" ? therapist.activo : true,
  };
}

module.exports = {
  getRecommendedTherapists,
  normalizeRequiredCriteria,
  getReceptionTherapists,
  selectAvailableRecommendations,
};
