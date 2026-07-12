const admin = require("firebase-admin");
const {HttpsError} = require("firebase-functions/v2/https");
const {buildSearchCriteriaFromProfile} = require("./criteria");
const {findMatchingTherapists} = require("./therapistMatching");
const {getCurrentProfile} = require("../profiles/profile");

async function getRecommendedTherapists(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();
  const profileRef = db.collection("profiles").doc(uid);
  const profile = await getCurrentProfile(profileRef);
  const criteria = buildSearchCriteriaFromProfile(profile);
  const availableTherapistIds = await getTherapistIdsWithAvailableSlots(db);
  const therapists = await getActiveTherapists(db, availableTherapistIds);
  const recommendations = findMatchingTherapists(therapists, criteria);

  return {
    profile,
    criteria,
    therapists: recommendations.map(sanitizeTherapistForClient),
  };
}

async function getActiveTherapists(db, availableTherapistIds = new Set()) {
  if (!availableTherapistIds.size) {
    return [];
  }

  const snapshot = await db.collection("therapists").orderBy("nombre").get();

  return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((therapist) =>
        therapist.activo !== false && availableTherapistIds.has(therapist.id),
      );
}

async function getTherapistIdsWithAvailableSlots(db) {
  const snapshot = await db
      .collection("therapist_availability")
      .where("status", "==", "available")
      .get();
  const today = getTodayISOForLima();
  const therapistIds = new Set();

  snapshot.docs.forEach((doc) => {
    const slot = doc.data();
    const therapistId = (slot.therapistId || "").toString().trim();
    const date = (slot.date || "").toString().trim();

    if (therapistId && date && date >= today) {
      therapistIds.add(therapistId);
    }
  });

  return therapistIds;
}

function sanitizeTherapistForClient(therapist = {}) {
  return {
    id: therapist.id || "",
    uid: therapist.uid || "",
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

function getTodayISOForLima() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

module.exports = {
  getRecommendedTherapists,
};
