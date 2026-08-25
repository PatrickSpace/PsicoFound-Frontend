const crypto = require("node:crypto");
const admin = require("firebase-admin");
const {HttpsError} = require("firebase-functions/v2/https");
const {requireAppCheckIfEnabled} = require("../security/appCheck");

const FieldValue = admin.firestore.FieldValue;
const QA_ACCOUNT_DEFINITIONS = [
  {
    key: "patient",
    email: "qa.patient@example.com",
    name: "Paciente QA",
    roles: ["patient"],
  },
  {
    key: "patient-active",
    email: "qa.patient.active@example.com",
    name: "Paciente con terapia QA",
    roles: ["patient"],
  },
  {
    key: "psychologist-online",
    email: "qa.psychologist.online@example.com",
    name: "Andrea Online QA",
    roles: ["patient", "psychologist"],
    therapistId: "qa-psychologist-online",
    modalities: ["Remoto"],
    paymentStatus: "connected",
  },
  {
    key: "psychologist-in-person",
    email: "qa.psychologist.presencial@example.com",
    name: "Marco Presencial QA",
    roles: ["patient", "psychologist"],
    therapistId: "qa-psychologist-presencial",
    modalities: ["Presencial"],
    paymentStatus: "connected",
  },
  {
    key: "psychologist-no-payments",
    email: "qa.psychologist.no-payments@example.com",
    name: "Lucia Sin Cobros QA",
    roles: ["patient", "psychologist"],
    therapistId: "qa-psychologist-no-payments",
    modalities: ["Remoto"],
    paymentStatus: "not_started",
  },
  {
    key: "psychologist-restricted",
    email: "qa.psychologist.restricted@example.com",
    name: "Diego Restringido QA",
    roles: ["patient", "psychologist"],
    therapistId: "qa-psychologist-restricted",
    modalities: ["Remoto"],
    paymentStatus: "restricted",
  },
];

async function upsertUserByAdmin(request) {
  const {db, uid: adminUid} = await requireAdminRequest(request);
  const data = request.data || {};
  const uid = cleanText(data.uid, 128);
  const roles = normalizeRoles(data.roles);

  if (!uid || !roles.length) {
    throw new HttpsError(
        "invalid-argument",
        "El UID y al menos un rol son obligatorios.",
    );
  }
  if (uid === adminUid && !roles.includes("admin")) {
    throw new HttpsError(
        "failed-precondition",
        "No puedes quitarte tu propio rol admin.",
    );
  }

  let authUser;
  try {
    authUser = await admin.auth().getUser(uid);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw new HttpsError(
          "not-found",
          [
            "La cuenta no existe en Firebase Authentication.",
            "Créala desde el registro o usa el generador QA.",
          ].join(" "),
      );
    }
    throw error;
  }

  const email = hasOwn(data, "email") ?
    cleanText(data.email, 240).toLowerCase() : authUser.email || "";
  const displayName = hasOwn(data, "nombre") ?
    cleanText(data.nombre, 120) : authUser.displayName || "";
  const userUpdate = {
    id: uid,
    email,
    nombre: displayName,
    roles,
    rol: legacyRole(roles),
    accountStatus: "active",
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (hasOwn(data, "fechaNacimiento")) {
    userUpdate.fechaNacimiento = cleanText(data.fechaNacimiento, 10);
  }
  if (hasOwn(data, "telefono")) {
    userUpdate.telefono = cleanText(data.telefono, 40);
  }

  await db.collection("users").doc(uid).set(userUpdate, {merge: true});

  await admin.auth().updateUser(uid, {
    ...(email ? {email} : {}),
    ...(displayName ? {displayName} : {}),
    disabled: false,
  });

  return {uid, roles};
}

async function setUserAccountStatusByAdmin(request) {
  const {db, uid: adminUid} = await requireAdminRequest(request);
  const uid = cleanText(request.data?.uid, 128);
  const status = cleanText(request.data?.status, 20).toLowerCase();

  if (!uid || !["active", "disabled"].includes(status)) {
    throw new HttpsError(
        "invalid-argument",
        "El usuario o estado no son válidos.",
    );
  }
  if (uid === adminUid && status === "disabled") {
    throw new HttpsError(
        "failed-precondition",
        "No puedes desactivar tu propia cuenta.",
    );
  }

  await admin.auth().updateUser(uid, {disabled: status === "disabled"});
  await admin.auth().revokeRefreshTokens(uid);
  await db.collection("users").doc(uid).set({
    accountStatus: status,
    disabledAt: status === "disabled" ? FieldValue.serverTimestamp() : null,
    disabledBy: status === "disabled" ? adminUid : "",
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});

  return {uid, status};
}

async function seedQaMarketplaceData(request) {
  const {db, uid: adminUid} = await requireAdminRequest(request);
  if (String(process.env.ENABLE_QA_SEED || "false").toLowerCase() !== "true") {
    throw new HttpsError(
        "failed-precondition",
        "El generador QA está deshabilitado.",
    );
  }

  const allowedUids = String(process.env.QA_ADMIN_UIDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  if (!allowedUids.includes(adminUid)) {
    throw new HttpsError(
        "permission-denied",
        "Tu cuenta no está habilitada para generar datos QA.",
    );
  }

  const temporaryPassword = String(request.data?.temporaryPassword || "");
  if (temporaryPassword.length < 12) {
    throw new HttpsError(
        "invalid-argument",
        "La contraseña temporal debe tener al menos 12 caracteres.",
    );
  }

  const results = [];
  for (const definition of QA_ACCOUNT_DEFINITIONS) {
    const userRecord = await upsertAuthUser(definition, temporaryPassword);
    results.push({
      key: definition.key,
      email: definition.email,
      uid: userRecord.uid,
      therapistId: definition.therapistId || "",
    });
  }

  const audienceUids = [adminUid, ...results.map((account) => account.uid)];
  for (const definition of QA_ACCOUNT_DEFINITIONS) {
    const account = results.find((result) => result.key === definition.key);
    await writeQaUser(db, account.uid, definition, audienceUids);
    if (definition.therapistId) {
      await writeQaTherapist(db, account.uid, definition, audienceUids);
      await writeQaAvailability(db, definition, audienceUids);
    }
  }

  await writeQaActiveTherapyScenario(db, results, adminUid, audienceUids);

  return {accounts: results};
}

async function upsertAuthUser(definition, password) {
  let record;
  try {
    record = await admin.auth().getUserByEmail(definition.email);
    record = await admin.auth().updateUser(record.uid, {
      password,
      displayName: definition.name,
      disabled: false,
      emailVerified: false,
    });
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    record = await admin.auth().createUser({
      email: definition.email,
      password,
      displayName: definition.name,
      disabled: false,
      emailVerified: false,
    });
  }
  return record;
}

async function writeQaUser(db, uid, definition, audienceUids) {
  await db.collection("users").doc(uid).set({
    id: uid,
    email: definition.email,
    nombre: definition.name,
    roles: definition.roles,
    rol: legacyRole(definition.roles),
    onboardingStatus: "complete",
    patientOnboardingStatus: "complete",
    professionalOnboardingStatus: definition.therapistId ?
      "complete" : "not_started",
    professionalAccessStatus: definition.therapistId ?
      "approved" : "not_requested",
    professionalProfileId: definition.therapistId || "",
    accountStatus: "active",
    isTestAccount: true,
    testAudienceUids: audienceUids,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
}

async function writeQaTherapist(db, uid, definition, audienceUids) {
  const now = FieldValue.serverTimestamp();
  await db.collection("therapists").doc(definition.therapistId).set({
    uid,
    nombre: definition.name,
    avatar: "",
    description: [
      "Perfil profesional de prueba para validar",
      "el flujo de Lurems.",
    ].join(" "),
    mensaje: "Cuenta QA. No corresponde a un profesional real.",
    direccion: definition.modalities.includes("Presencial") ?
      "Consultorio QA, Lima" : "",
    especialidades: ["Ansiedad", "Bienestar emocional"],
    enfoques: ["Cognitivo-Conductual", "Humanista"],
    genero: definition.key.includes("in-person") ||
      definition.key.includes("no-payments") ?
      "mujer" : "hombre",
    modalidades: definition.modalities,
    sessionPriceAmount: 10000,
    paymentCurrency: "PEN",
    gradient: "linear-gradient(to bottom right, #45A99A, #72CBBF)",
    activo: true,
    isTestAccount: true,
    testAudienceUids: audienceUids,
    createdAt: now,
    updatedAt: now,
  }, {merge: true});

  await db.collection("payment_accounts").doc(definition.therapistId).set({
    psychologistId: definition.therapistId,
    psychologistUid: uid,
    provider: "mercado_pago",
    environment: "sandbox",
    status: definition.paymentStatus,
    providerAccountId: definition.paymentStatus === "connected" ?
      `fake-seller-${definition.therapistId}` : "",
    providerUserId: definition.paymentStatus === "connected" ?
      `fake-user-${definition.therapistId}` : "",
    isFake: true,
    restrictions: definition.paymentStatus === "restricted" ?
      [{
        code: "qa_restricted",
        message: "Cuenta restringida para pruebas.",
      }] : [],
    connectedAt: definition.paymentStatus === "connected" ? now : null,
    lastValidatedAt: now,
    createdAt: now,
    updatedAt: now,
  }, {merge: true});
}

async function writeQaAvailability(db, definition, audienceUids) {
  const batch = db.batch();
  const dates = nextWeekdays(5);
  dates.forEach((date, dateIndex) => {
    ["10:00", "16:00"].forEach((startTime, timeIndex) => {
      const hour = Number(startTime.slice(0, 2)) + 1;
      const id = `qa-${definition.therapistId}-${date}-${timeIndex}`;
      batch.set(db.collection("therapist_availability").doc(id), {
        therapistId: definition.therapistId,
        date,
        startTime,
        endTime: `${String(hour).padStart(2, "0")}:00`,
        modality: definition.modalities[0],
        location: definition.modalities.includes("Presencial") ?
          "Consultorio QA, Lima" : "",
        status: "available",
        isTestAccount: true,
        testAudienceUids: audienceUids,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        sortOrder: dateIndex * 2 + timeIndex,
      }, {merge: true});
    });
  });
  await batch.commit();
}

async function writeQaActiveTherapyScenario(
    db,
    accounts,
    adminUid,
    audienceUids,
) {
  const patient = accounts.find((account) => account.key === "patient-active");
  const psychologist = accounts.find(
      (account) => account.key === "psychologist-online",
  );
  if (!patient || !psychologist) return;

  const scope = crypto.createHash("sha256")
      .update(adminUid)
      .digest("hex")
      .slice(0, 12);
  const bookingId = `qa-confirmed-${scope}`;
  const therapyId = `qa-therapy-${scope}`;
  const slotId = `qa-booked-slot-${scope}`;
  const date = nextWeekdays(1)[0];
  const now = FieldValue.serverTimestamp();
  const appointment = {
    citaId: bookingId,
    terapiaId: therapyId,
    usuarioId: patient.uid,
    terapeutaId: psychologist.therapistId,
    fecha: date,
    hora: "12:00",
    estado: "confirmada",
    notas: "Escenario QA sin información clínica real.",
    modalidad: "Remoto",
    ubicacion: "Terapia Online",
    availabilitySlotId: slotId,
    bookingId,
    paymentId: bookingId,
    paymentStatus: "approved",
  };
  const split = {
    grossAmount: 10000,
    platformCommissionGrossAmount: 3000,
    psychologistGrossAmount: 7000,
    processorFeeAmount: 0,
    platformNetAmount: 3000,
    psychologistNetAmount: 7000,
    totalAllocatedAmount: 10000,
  };
  const commissionRuleSnapshot = {
    ruleId: "default-marketplace-split",
    version: 1,
    platformPercentage: 30,
    psychologistPercentage: 70,
    processorFeeBearer: "platform",
  };
  const batch = db.batch();

  batch.set(db.collection("therapist_availability").doc(slotId), {
    therapistId: psychologist.therapistId,
    date,
    startTime: "12:00",
    endTime: "13:00",
    modality: "Remoto",
    location: "Terapia Online",
    status: "booked",
    bookedBy: patient.uid,
    appointmentId: bookingId,
    bookingId,
    isTestAccount: true,
    testAudienceUids: audienceUids,
    createdAt: now,
    updatedAt: now,
  }, {merge: true});
  batch.set(db.collection("bookings").doc(bookingId), {
    patientId: patient.uid,
    psychologistId: psychologist.therapistId,
    psychologistUid: psychologist.uid,
    slotId,
    terapiaId: therapyId,
    patientName: "Paciente con terapia QA",
    patientEmail: patient.email,
    psychologistName: "Andrea Online QA",
    status: "confirmed",
    paymentStatus: "approved",
    date,
    startTime: "12:00",
    endTime: "13:00",
    timezone: "America/Lima",
    modality: "virtual",
    location: "Terapia Online",
    currency: "PEN",
    priceAmount: 10000,
    paymentId: bookingId,
    commissionRuleSnapshot,
    isTestAccount: true,
    testAudienceUids: audienceUids,
    confirmedAt: now,
    createdAt: now,
    updatedAt: now,
  }, {merge: true});
  batch.set(db.collection("payments").doc(bookingId), {
    bookingId,
    patientId: patient.uid,
    psychologistId: psychologist.therapistId,
    provider: "mercado_pago",
    environment: "sandbox",
    isFake: true,
    providerPaymentId: `fake-pay-${bookingId}`,
    providerAccountId: `fake-seller-${psychologist.therapistId}`,
    externalReference: `booking:${bookingId}`,
    idempotencyKey: `payment:create:${bookingId}`,
    status: "approved",
    currency: "PEN",
    ...split,
    commissionRuleSnapshot,
    paymentConsent: {
      version: "2026-08-24",
      accepted: true,
      acceptedBy: patient.uid,
      acceptedAt: now,
    },
    isTestAccount: true,
    testAudienceUids: audienceUids,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  }, {merge: true});
  batch.set(db.collection("citas").doc(bookingId), {
    usuarioId: patient.uid,
    pacienteUid: patient.uid,
    terapeutaId: psychologist.therapistId,
    terapeutaNombre: "Andrea Online QA",
    terapiaId: therapyId,
    pacienteNombre: "Paciente con terapia QA",
    pacienteEmail: patient.email,
    fecha: date,
    hora: "12:00",
    modalidad: "Remoto",
    ubicacion: "Terapia Online",
    notas: appointment.notas,
    estado: "confirmada",
    availabilitySlotId: slotId,
    bookingId,
    paymentId: bookingId,
    paymentStatus: "approved",
    isTestAccount: true,
    testAudienceUids: audienceUids,
    createdAt: now,
    updatedAt: now,
  }, {merge: true});
  batch.set(db.collection("terapias").doc(therapyId), {
    usuarioId: patient.uid,
    pacienteUid: patient.uid,
    pacienteNombre: "Paciente con terapia QA",
    pacienteEmail: patient.email,
    terapeutaId: psychologist.therapistId,
    terapeutaNombre: "Andrea Online QA",
    modalidad: "Remoto",
    estado: "activo",
    citas: [appointment],
    intakeSnapshot: {
      profileSessionId: "qa-session",
      motivoConsulta: "",
      temas: [],
      soloConversar: false,
      riesgoSuicida: false,
      nivelMalestar: "",
      urgencia: "",
      modalidad: "Remoto",
      preferenciaGenero: "",
      preferenciaEdad: "",
      enfoque: "",
      observaciones: "Escenario QA sin información clínica real.",
      capturedAt: now,
    },
    motivoTerapia: "",
    detalleTerapia: "Escenario QA para validar una terapia activa.",
    objetivosIniciales: [],
    isTestAccount: true,
    testAudienceUids: audienceUids,
    createdAt: now,
    updatedAt: now,
  }, {merge: true});

  [
    ["cash_collected", "debit", 10000],
    ["psychologist_payable", "credit", 7000],
    ["platform_revenue", "credit", 3000],
  ].forEach(([account, direction, amount]) => {
    const id = crypto.createHash("sha256")
        .update(`ledger:${bookingId}:payment_approved:${account}`)
        .digest("hex");
    batch.set(db.collection("ledger_entries").doc(id), {
      paymentId: bookingId,
      bookingId,
      patientId: patient.uid,
      psychologistId: psychologist.therapistId,
      account,
      direction,
      amount,
      currency: "PEN",
      eventType: "payment_approved",
      idempotencyKey: `ledger:${bookingId}:payment_approved:${account}`,
      isTestAccount: true,
      createdAt: now,
    }, {merge: true});
  });
  await batch.commit();
}

function nextWeekdays(count) {
  const dates = [];
  const cursor = new Date();
  while (dates.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
  }
  return dates;
}

async function requireAdminRequest(request) {
  requireAppCheckIfEnabled(request);
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const db = admin.firestore();
  const snapshot = await db.collection("users").doc(request.auth.uid).get();
  const roles = normalizeRoles(snapshot.data()?.roles, snapshot.data()?.rol);
  if (!roles.includes("admin")) {
    throw new HttpsError(
        "permission-denied",
        "Necesitas permisos de administrador.",
    );
  }
  return {db, uid: request.auth.uid};
}

function normalizeRoles(roles, legacy = "") {
  const values = Array.isArray(roles) ? roles : [];
  if (["paciente", "patient"].includes(legacy)) values.push("patient");
  if (["psicologo", "psychologist"].includes(legacy)) {
    values.push("psychologist");
  }
  if (["admin", "psicofound-admin"].includes(legacy)) values.push("admin");
  return [...new Set(values.map((role) => cleanText(role, 40).toLowerCase()))]
      .filter((role) => ["patient", "psychologist", "admin"].includes(role));
}

function legacyRole(roles) {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("psychologist")) return "psicologo";
  return "patient";
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

module.exports = {
  seedQaMarketplaceData,
  setUserAccountStatusByAdmin,
  upsertUserByAdmin,
};
