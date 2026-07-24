const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {HttpsError} = require("firebase-functions/v2/https");

const PATIENT_ROLE = "patient";
const PSYCHOLOGIST_ROLE = "psychologist";
const ADMIN_ROLES = ["admin", "psicofound-admin"];
const REGISTRATION_INTENTS = ["patient", "psychologist"];
const DEFAULT_THERAPIST_GRADIENT =
  "linear-gradient(to bottom right, #45A99A, #72CBBF)";

async function finalizeRegistration(request) {
  const auth = requireAuth(request);
  const data = request.data || {};
  const token = auth.token || {};
  const intent = normalizeRegistrationIntent(data.intent);
  const db = admin.firestore();
  const userRef = db.collection("users").doc(auth.uid);
  const snapshot = await userRef.get();
  const existing = snapshot.data() || {};
  const roles = normalizeRoles(existing.roles, existing.rol);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const displayName = cleanText(
      data.displayName || token.name,
      120,
  );
  const professionalStatus =
    intent === "psychologist" ?
      normalizeProfessionalStatus(existing.professionalAccessStatus) :
      existing.professionalAccessStatus || "not_requested";
  const payload = {
    id: auth.uid,
    email: token.email || existing.email || "",
    nombre: displayName || existing.nombre || emailPrefix(token.email),
    roles: roles.length ? roles : [PATIENT_ROLE],
    rol: getLegacyRole(roles.length ? roles : [PATIENT_ROLE]),
    registrationIntent: intent,
    onboardingStatus: getInitialOnboardingStatus(existing, intent),
    patientOnboardingStatus:
      existing.patientOnboardingStatus || "pending",
    professionalAccessStatus: professionalStatus,
    updatedAt: now,
  };

  if (!snapshot.exists) {
    payload.createdAt = now;
  }

  await userRef.set(payload, {merge: true});
  logger.info("Registration initialized", {intent});

  return {
    profile: serializeUserProfile(auth.uid, existing, payload),
    nextRoute: getNextRegistrationRoute(intent, payload),
  };
}

async function completePatientOnboarding(request) {
  const auth = requireAuth(request);
  const profile = sanitizePatientProfile(request.data);
  const token = auth.token || {};
  const db = admin.firestore();
  const userRef = db.collection("users").doc(auth.uid);
  const snapshot = await userRef.get();
  const existing = snapshot.data() || {};
  const roles = normalizeRoles(existing.roles, existing.rol);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await userRef.set(
      {
        id: auth.uid,
        email: token.email || existing.email || "",
        nombre: profile.nombre,
        fechaNacimiento: profile.fechaNacimiento,
        telefono: profile.telefono,
        pais: profile.pais,
        zonaHoraria: profile.zonaHoraria,
        roles: roles.length ? roles : [PATIENT_ROLE],
        rol: getLegacyRole(roles.length ? roles : [PATIENT_ROLE]),
        registrationIntent: existing.registrationIntent || PATIENT_ROLE,
        onboardingStatus: "complete",
        patientOnboardingStatus: "complete",
        updatedAt: now,
        ...(!snapshot.exists ? {createdAt: now} : {}),
      },
      {merge: true},
  );

  logger.info("Patient onboarding completed");
  return {nextRoute: "/encuesta"};
}

async function submitPsychologistApplication(request) {
  const auth = requireAuth(request);
  const application = sanitizeProfessionalApplication(request.data);
  const token = auth.token || {};
  const db = admin.firestore();
  const userRef = db.collection("users").doc(auth.uid);
  const existingRequest = await getLatestProfessionalRequest(db, auth.uid);
  const existingStatus = normalizeProfessionalStatus(
      existingRequest && existingRequest.status,
  );

  if (["pending", "approved"].includes(existingStatus)) {
    throw new HttpsError(
        "failed-precondition",
        existingStatus === "approved" ?
          "Tu perfil profesional ya fue aprobado." :
          "Ya tienes una solicitud pendiente de revision.",
    );
  }

  const userSnapshot = await userRef.get();
  const existingUser = userSnapshot.data() || {};
  const roles = normalizeRoles(existingUser.roles, existingUser.rol);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const requestRef = db.collection("psychologist_requests").doc();
  const batch = db.batch();

  batch.set(requestRef, {
    userUid: auth.uid,
    userEmail: token.email || existingUser.email || "",
    userName: application.professionalName,
    ...application,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  batch.set(
      userRef,
      {
        id: auth.uid,
        email: token.email || existingUser.email || "",
        nombre: application.professionalName,
        telefono: application.phone,
        pais: application.country,
        roles: roles.length ? roles : [PATIENT_ROLE],
        rol: getLegacyRole(roles.length ? roles : [PATIENT_ROLE]),
        registrationIntent: PSYCHOLOGIST_ROLE,
        onboardingStatus: "complete",
        professionalOnboardingStatus: "complete",
        professionalAccessStatus: "pending",
        latestPsychologistRequestId: requestRef.id,
        updatedAt: now,
        ...(!userSnapshot.exists ? {createdAt: now} : {}),
      },
      {merge: true},
  );
  await batch.commit();

  logger.info("Psychologist application submitted");
  return {
    request: {
      id: requestRef.id,
      ...application,
      status: "pending",
    },
    nextRoute: "/onboarding/psicologo/pendiente",
  };
}

async function reviewPsychologistApplication(request) {
  const auth = requireAuth(request);
  const data = request.data || {};
  const requestId = cleanText(data.requestId, 160);
  const action = cleanText(data.action, 20).toLowerCase();
  const rejectionReason = cleanText(data.rejectionReason, 800);

  if (!requestId || !["approve", "reject"].includes(action)) {
    throw new HttpsError(
        "invalid-argument",
        "La solicitud o la accion no son validas.",
    );
  }

  const db = admin.firestore();
  await requireAdmin(db, auth.uid);
  const applicationRef = db.collection("psychologist_requests").doc(requestId);
  const therapistRef = db.collection("therapists").doc();
  let result = null;

  await db.runTransaction(async (transaction) => {
    const applicationSnapshot = await transaction.get(applicationRef);

    if (!applicationSnapshot.exists) {
      throw new HttpsError("not-found", "La solicitud no existe.");
    }

    const application = applicationSnapshot.data();

    if (!application.userUid) {
      throw new HttpsError(
          "failed-precondition",
          "La solicitud no tiene un usuario asociado.",
      );
    }

    const status = normalizeProfessionalStatus(application.status);
    const userRef = db.collection("users").doc(application.userUid);
    const userSnapshot = await transaction.get(userRef);
    const user = userSnapshot.data() || {};
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (action === "approve") {
      if (status === "approved" && application.therapistId) {
        result = {
          status: "approved",
          therapistId: application.therapistId,
        };
        return;
      }

      const roles = normalizeRoles(user.roles, user.rol);
      const approvedRoles = Array.from(
          new Set([...roles, PATIENT_ROLE, PSYCHOLOGIST_ROLE]),
      );

      transaction.set(therapistRef, {
        uid: application.userUid,
        nombre: application.professionalName || application.userName || "",
        avatar: "",
        description: application.professionalSummary || "",
        mensaje: application.motivation || "",
        direccion: application.practiceLocation || "",
        especialidades: application.specialties || [],
        enfoques: application.approaches || [],
        genero: application.gender || "",
        edad: null,
        modalidades: application.modalities || [],
        licenseNumber: application.licenseNumber || "",
        country: application.country || "",
        yearsExperience: application.yearsExperience || 0,
        gradient: DEFAULT_THERAPIST_GRADIENT,
        activo: true,
        createdAt: now,
        updatedAt: now,
      });
      transaction.set(
          userRef,
          {
            roles: approvedRoles,
            rol: getLegacyRole(approvedRoles),
            professionalAccessStatus: "approved",
            professionalProfileId: therapistRef.id,
            updatedAt: now,
          },
          {merge: true},
      );
      transaction.update(applicationRef, {
        status: "approved",
        therapistId: therapistRef.id,
        reviewedBy: auth.uid,
        reviewedAt: now,
        updatedAt: now,
      });
      result = {status: "approved", therapistId: therapistRef.id};
      return;
    }

    if (status === "approved") {
      throw new HttpsError(
          "failed-precondition",
          "Una solicitud aprobada no puede rechazarse.",
      );
    }

    transaction.set(
        userRef,
        {
          professionalAccessStatus: "rejected",
          updatedAt: now,
        },
        {merge: true},
    );
    transaction.update(applicationRef, {
      status: "rejected",
      rejectionReason,
      reviewedBy: auth.uid,
      reviewedAt: now,
      updatedAt: now,
    });
    result = {status: "rejected"};
  });

  logger.info("Psychologist application reviewed", {action});
  return result;
}

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  return request.auth;
}

async function requireAdmin(db, uid) {
  const snapshot = await db.collection("users").doc(uid).get();
  const user = snapshot.data() || {};
  const roles = normalizeRoles(user.roles, user.rol);

  if (!roles.includes("admin") && !ADMIN_ROLES.includes(user.rol)) {
    throw new HttpsError(
        "permission-denied",
        "Necesitas permisos de administrador.",
    );
  }
}

function normalizeRegistrationIntent(value) {
  const intent = cleanText(value, 30).toLowerCase();

  if (!REGISTRATION_INTENTS.includes(intent)) {
    throw new HttpsError(
        "invalid-argument",
        "Selecciona si deseas registrarte como paciente o psicologo.",
    );
  }

  return intent;
}

function sanitizePatientProfile(data = {}) {
  const profile = {
    nombre: cleanText(data.nombre, 120),
    fechaNacimiento: cleanText(data.fechaNacimiento, 10),
    telefono: cleanText(data.telefono, 40),
    pais: cleanText(data.pais, 80),
    zonaHoraria: cleanText(data.zonaHoraria, 80),
  };

  if (!profile.nombre || !isIsoDate(profile.fechaNacimiento)) {
    throw new HttpsError(
        "invalid-argument",
        "Completa tu nombre y una fecha de nacimiento valida.",
    );
  }

  return profile;
}

function sanitizeProfessionalApplication(data = {}) {
  const application = {
    professionalName: cleanText(data.professionalName, 120),
    licenseNumber: cleanText(data.licenseNumber, 80),
    country: cleanText(data.country, 80),
    phone: cleanText(data.phone, 40),
    yearsExperience: normalizeYears(data.yearsExperience),
    specialties: normalizeStringArray(data.specialties, 12, 80),
    approaches: normalizeStringArray(data.approaches, 12, 80),
    modalities: normalizeStringArray(data.modalities, 5, 40),
    gender: cleanText(data.gender, 40),
    practiceLocation: cleanText(data.practiceLocation, 180),
    professionalSummary: cleanText(data.professionalSummary, 1200),
    motivation: cleanText(data.motivation, 800),
  };

  if (
    !application.professionalName ||
    !application.licenseNumber ||
    !application.country ||
    !application.professionalSummary ||
    !application.specialties.length ||
    !application.approaches.length ||
    !application.modalities.length
  ) {
    throw new HttpsError(
        "invalid-argument",
        "Completa los datos profesionales obligatorios.",
    );
  }

  return application;
}

async function getLatestProfessionalRequest(db, uid) {
  const snapshot = await db
      .collection("psychologist_requests")
      .where("userUid", "==", uid)
      .get();
  const requests = snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));

  return requests.sort((a, b) => getTimestamp(b) - getTimestamp(a))[0] || null;
}

function normalizeRoles(roles, legacyRole) {
  const values = Array.isArray(roles) ? [...roles] : [];

  if (legacyRole === "psicologo") values.push(PSYCHOLOGIST_ROLE);
  if (ADMIN_ROLES.includes(legacyRole)) values.push("admin");
  if (["paciente", PATIENT_ROLE].includes(legacyRole)) {
    values.push(PATIENT_ROLE);
  }

  return Array.from(
      new Set(
          values
              .map((role) => cleanText(role, 40).toLowerCase())
              .filter((role) =>
                [PATIENT_ROLE, PSYCHOLOGIST_ROLE, "admin"].includes(role),
              ),
      ),
  );
}

function getLegacyRole(roles) {
  if (roles.includes("admin")) return "admin";
  if (roles.includes(PSYCHOLOGIST_ROLE)) return "psicologo";
  return PATIENT_ROLE;
}

function getInitialOnboardingStatus(existing, intent) {
  if (existing.onboardingStatus === "complete") {
    if (
      intent === "psychologist" &&
      !["pending", "approved"].includes(
          normalizeProfessionalStatus(existing.professionalAccessStatus),
      )
    ) {
      return "pending";
    }

    return "complete";
  }

  return "pending";
}

function normalizeProfessionalStatus(value) {
  const status = cleanText(value, 30).toLowerCase();
  return status || "draft";
}

function getNextRegistrationRoute(intent, profile) {
  if (profile.onboardingStatus !== "complete") {
    return intent === PSYCHOLOGIST_ROLE ?
      "/onboarding/psicologo" :
      "/onboarding/paciente";
  }

  if (intent === PSYCHOLOGIST_ROLE) {
    if (profile.professionalAccessStatus === "pending") {
      return "/onboarding/psicologo/pendiente";
    }

    if (profile.professionalAccessStatus === "approved") {
      return "/psicologo/sesiones";
    }
  }

  return "/dashboard";
}

function serializeUserProfile(uid, existing, payload) {
  const profile = {
    ...existing,
    ...payload,
    id: uid,
  };

  delete profile.createdAt;
  delete profile.updatedAt;
  return profile;
}

function cleanText(value, maxLength) {
  return (value || "").toString().trim().slice(0, maxLength);
}

function normalizeStringArray(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];

  return Array.from(
      new Set(
          value
              .map((item) => cleanText(item, maxLength))
              .filter(Boolean),
      ),
  ).slice(0, maxItems);
}

function normalizeYears(value) {
  const years = Number(value);
  return Number.isFinite(years) && years >= 0 && years <= 80 ? years : 0;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  const normalized = Number.isNaN(date.getTime()) ?
    "" :
    date.toISOString().slice(0, 10);
  return normalized === value && value <= new Date().toISOString().slice(0, 10);
}

function emailPrefix(email) {
  return cleanText((email || "").split("@")[0], 120) || "Usuario";
}

function getTimestamp(item) {
  const value = item && item.createdAt;
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  return new Date(value).getTime() || 0;
}

function safeCallable(handler, publicMessage) {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("Unhandled onboarding error", {
        errorType: error && error.name ? error.name : "UnknownError",
        errorMessage: error && error.message ?
          error.message.slice(0, 240) :
          "Unknown error",
      });
      throw new HttpsError("internal", publicMessage);
    }
  };
}

module.exports = {
  completePatientOnboarding: safeCallable(
      completePatientOnboarding,
      "No pudimos guardar tu perfil. Intenta nuevamente.",
  ),
  finalizeRegistration: safeCallable(
      finalizeRegistration,
      "Tu cuenta fue creada, pero no pudimos preparar tu perfil. " +
        "Intenta continuar nuevamente.",
  ),
  normalizeRegistrationIntent,
  reviewPsychologistApplication: safeCallable(
      reviewPsychologistApplication,
      "No pudimos actualizar la solicitud profesional. Intenta nuevamente.",
  ),
  sanitizePatientProfile,
  sanitizeProfessionalApplication,
  submitPsychologistApplication: safeCallable(
      submitPsychologistApplication,
      "No pudimos enviar tu solicitud profesional. Intenta nuevamente.",
  ),
};
