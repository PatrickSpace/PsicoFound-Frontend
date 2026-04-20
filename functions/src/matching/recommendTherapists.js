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
  const therapists = await getActiveTherapists(db);
  const recommendations = findMatchingTherapists(therapists, criteria);

  return {
    profile,
    criteria,
    therapists: recommendations.map(sanitizeTherapistForClient),
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

module.exports = {
  getRecommendedTherapists,
};
