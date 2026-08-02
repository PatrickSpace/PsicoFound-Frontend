const admin = require("firebase-admin");
const {HttpsError} = require("firebase-functions/v2/https");
const {
  buildInitialTherapyFields,
  buildIntakeSnapshot,
} = require("./intakeSnapshot");

async function createTherapyFromProfile(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const uid = request.auth.uid;
  const data = request.data || {};
  const therapistId = cleanText(data.terapeutaId, 180);
  if (!therapistId) {
    throw new HttpsError("invalid-argument", "Debes seleccionar un psicólogo.");
  }

  const db = admin.firestore();
  const therapyRef = db.collection("terapias").doc();
  const userRef = db.collection("users").doc(uid);
  const profileRef = db.collection("profiles").doc(uid);
  const therapistRef = db.collection("therapists").doc(therapistId);

  await db.runTransaction(async (transaction) => {
    const activeTherapyQuery = db.collection("terapias")
        .where("pacienteUid", "==", uid)
        .where("estado", "==", "activo")
        .limit(1);
    const [userSnapshot, profileSnapshot, therapistSnapshot, activeTherapies] =
      await Promise.all([
        transaction.get(userRef),
        transaction.get(profileRef),
        transaction.get(therapistRef),
        transaction.get(activeTherapyQuery),
      ]);

    if (!userSnapshot.exists) {
      throw new HttpsError(
          "failed-precondition",
          "Completa tu registro primero.",
      );
    }
    if (!therapistSnapshot.exists ||
      therapistSnapshot.data().activo === false) {
      throw new HttpsError(
          "failed-precondition",
          "El psicólogo no está disponible.",
      );
    }
    if (!activeTherapies.empty) {
      throw new HttpsError(
          "already-exists",
          "Ya tienes una terapia activa. Pausa o cancela esa terapia primero.",
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const user = userSnapshot.data() || {};
    const therapist = therapistSnapshot.data() || {};
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const isPatient = roles.includes("patient") ||
      ["patient", "paciente"].includes(user.rol);
    if (!isPatient) {
      throw new HttpsError(
          "permission-denied",
          "Tu cuenta no tiene acceso al flujo de paciente.",
      );
    }
    const intakeSnapshot = buildIntakeSnapshot(
        profileSnapshot.exists ? profileSnapshot.data() : {},
        now,
    );

    transaction.create(therapyRef, {
      usuarioId: uid,
      pacienteUid: uid,
      pacienteNombre: cleanText(
          data.pacienteNombre || user.nombre,
          160,
      ) || "Paciente",
      pacienteEmail: cleanText(data.pacienteEmail || user.email, 240),
      terapeutaId: therapistId,
      terapeutaNombre: cleanText(
          data.terapeutaNombre || therapist.nombre,
          160,
      ) || "Psicólogo",
      modalidad: cleanText(data.modalidad || intakeSnapshot.modalidad, 120),
      estado: "activo",
      fechaCreacion: new Date().toISOString(),
      citas: [],
      intakeSnapshot,
      ...buildInitialTherapyFields(intakeSnapshot),
      createdAt: now,
      updatedAt: now,
    });
  });

  return {id: therapyRef.id};
}

function cleanText(value, maxLength) {
  return (value || "").toString().trim().slice(0, maxLength);
}

module.exports = {
  createTherapyFromProfile,
};
