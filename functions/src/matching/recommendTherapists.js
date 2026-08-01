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

  const therapistIdGroups = chunk([...availableTherapistIds], 30);
  const snapshots = await Promise.all(
      therapistIdGroups.map((ids) =>
        db.collection("therapists")
            .where(admin.firestore.FieldPath.documentId(), "in", ids)
            .get(),
      ),
  );

  return snapshots
      .flatMap((snapshot) => snapshot.docs)
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((therapist) => therapist.activo !== false)
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
}

async function getTherapistIdsWithAvailableSlots(db) {
  const today = getTodayISOForLima();
  const snapshot = await db
      .collection("therapist_availability")
      .where("status", "==", "available")
      .where("date", ">=", today)
      .select("therapistId")
      .get();
  const therapistIds = new Set();

  snapshot.docs.forEach((doc) => {
    const slot = doc.data();
    const therapistId = (slot.therapistId || "").toString().trim();
    if (therapistId) {
      therapistIds.add(therapistId);
    }
  });

  return therapistIds;
}

function chunk(items, size) {
  const groups = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
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
