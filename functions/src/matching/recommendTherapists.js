const firestoreAdmin = require("firebase-admin/firestore");
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
const {modalityMatches} = require("./modality");
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
  const therapists = await getActiveTherapists(db);
  const matches = findMatchingTherapists(
      therapists,
      criteria,
      requiredCriteria,
      therapists.length,
  );
  const availability = await getFutureAvailabilityByTherapist(
      db,
  );
  const recommendations = matches.filter((therapist) =>
    availability.has(therapist.id),
  ).slice(0, 5);
  const outcome = recommendations.length ? "ok" :
    therapists.length ? "no_availability" : "no_matches";

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

async function getActiveTherapists(db) {
  const snapshot = await db.collection("therapists").orderBy("nombre").get();

  return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((therapist) => therapist.activo !== false);
}

async function getFutureAvailabilityByTherapist(db, requiredModality = "") {
  const snapshot = await db
      .collection("therapist_availability")
      .where("status", "==", "available")
      .get();
  const slotsByTherapist = new Map();

  snapshot.docs.forEach((doc) => {
    const slot = doc.data();
    const therapistId = (slot.therapistId || "").toString().trim();
    if (!therapistId || !modalityMatches(slot.modality, requiredModality)) {
      return;
    }
    try {
      assertFutureSlot(slot);
      const slots = slotsByTherapist.get(therapistId) || [];
      slots.push(doc.id);
      slotsByTherapist.set(therapistId, slots);
    } catch (error) {
      // Past or malformed availability is not offered to patients.
    }
  });

  return slotsByTherapist;
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
};
