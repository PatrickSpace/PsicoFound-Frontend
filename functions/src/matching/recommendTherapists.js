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

const CRITERIA_KEYS = new Set([
  "especialidades",
  "enfoque",
  "genero",
  "modalidad",
  "edad",
]);

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
  if (!profile.completado) {
    throw new HttpsError(
        "failed-precondition",
        "Completa tu perfil antes de solicitar recomendaciones.",
    );
  }
  const criteria = buildSearchCriteriaFromProfile(profile);
  const requiredCriteria = normalizeRequiredCriteria(
      request.data && request.data.requiredCriteria,
      criteria,
  );
  const therapists = await getActiveTherapists(db);
  const matches = findMatchingTherapists(
      therapists,
      criteria,
      requiredCriteria,
      therapists.length,
  );
  const availability = await getFutureAvailabilityByTherapist(
      db,
      requiredCriteria.includes("modalidad") ? criteria.modalidad : "",
  );
  const recommendations = matches.filter((therapist) =>
    availability.has(therapist.id),
  ).slice(0, 5);
  const outcome = recommendations.length ? "ok" :
    matches.length ? "no_availability" : "no_matches";

  return {
    profile,
    criteria,
    requiredCriteria,
    outcome,
    therapists: recommendations.map((therapist) => {
      const slots = availability.get(therapist.id) || [];
      return {
        ...sanitizeTherapistForClient(therapist),
        matchDetails: getMatchDetails(therapist, criteria),
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

function normalizeRequiredCriteria(value, criteria) {
  const requested = Array.isArray(value) ? value : [];
  const required = [...requested, ...(criteria.modalidad ? ["modalidad"] : [])];
  return [...new Set(required)]
      .filter((key) => CRITERIA_KEYS.has(key))
      .filter((key) => {
        const criterion = criteria[key];
        return Array.isArray(criterion) ?
          criterion.length > 0 : Boolean(criterion);
      });
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
