const {requirePatientRole} = require("../accounts/accessPolicy");
const firestoreAdmin = require("firebase-admin/firestore");
const {FieldPath, FieldValue} = require("firebase-admin/firestore");
const {createHash} = require("node:crypto");
const {HttpsError} = require("firebase-functions/v2/https");

function text(value, max = 2000) {
  if (typeof value !== "string" || value.length > max) {
    throw new HttpsError(
        "invalid-argument", "Texto inválido o demasiado largo.",
    );
  }
  return value.trim();
}

function id(value) {
  const result = text(value, 128);
  if (!result || result.includes("/")) {
    throw new HttpsError(
        "invalid-argument", "Identificador inválido.",
    );
  }
  return result;
}

async function context(request, transaction, therapyId) {
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated", "Debes iniciar sesión.",
    );
  }
  const mode = request.data.mode;
  if (!["patient", "psychologist"].includes(mode)) {
    throw new HttpsError(
        "invalid-argument", "Selecciona una vista válida.",
    );
  }
  const db = firestoreAdmin.getFirestore();
  const snapshot = await transaction.get(db.doc(`terapias/${id(therapyId)}`));
  const therapy = snapshot.data();
  if (!therapy) {
    throw new HttpsError(
        "permission-denied", "Terapia no disponible.",
    );
  }
  const uid = request.auth.uid;
  const user = (await transaction.get(db.doc(`users/${uid}`))).data() || {};
  if (mode === "patient") {
    requirePatientRole(user);
    if (therapy.pacienteUid !== uid) {
      throw new HttpsError(
          "permission-denied", "Este proceso no te pertenece.",
      );
    }
  } else {
    const therapist = (await transaction.get(
        db.doc(`therapists/${id(therapy.terapeutaId)}`),
    )).data();
    const roles = [...(user.roles || []), user.rol, user.role];
    if (!therapist || therapist.activo === false || therapist.uid !== uid ||
        !roles.some((role) =>
          ["psychologist", "psicologo", "psicólogo", "psicóloga"]
              .includes(role))) {
      throw new HttpsError(
          "permission-denied", "No estás vinculado a esta terapia.",
      );
    }
  }
  return {
    therapy: {...therapy, id: snapshot.id}, uid, mode,
    authorName: user.nombre || uid,
  };
}

function requireActive(ctx) {
  if (ctx.therapy.estado !== "activo") {
    throw new HttpsError(
        "failed-precondition", "La terapia es de consulta: no está activa.",
    );
  }
}

function identity(ctx) {
  return {
    terapiaId: ctx.therapy.id,
    pacienteUid: ctx.therapy.pacienteUid,
    pacienteNombre: ctx.therapy.pacienteNombre || "",
    terapeutaId: ctx.therapy.terapeutaId,
    terapeutaNombre: ctx.therapy.terapeutaNombre || "",
  };
}

function event(
    transaction, ctx, sourceId, type, title, summary, metadata = {},
) {
  const ref = firestoreAdmin.getFirestore()
      .collection("longitudinal_history").doc();
  transaction.create(ref, {
    ...identity(ctx), sourceId, sourceType: type.startsWith("goal_") ?
      "therapy_goal" : "exercise", eventType: type, title, summary, metadata,
    visibility: "patient", createdBy: ctx.uid, authorName: ctx.authorName,
    occurredAt: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function getTherapySharedSummary(request) {
  const db = firestoreAdmin.getFirestore();
  return db.runTransaction(async (transaction) => {
    const ctx = await context(request, transaction, request.data.therapyId);
    if (ctx.mode === "psychologist") {
      const appointment = await findSurveySharingAppointment(
          transaction, db, ctx);
      const summary = appointment.surveySummarySnapshot || {};
      return {
        status: "available",
        reason: summary.motivoConsulta || "",
        topics: Array.isArray(summary.temas) ? summary.temas : [],
        preferences: {
          modalidad: summary.modalidad || "",
          genero: summary.preferenciaGenero || "",
          edad: summary.preferenciaEdad || "",
          enfoque: summary.enfoque || "",
          soloConversar: Boolean(summary.soloConversar),
        },
        source: "Resumen aprobado por el paciente",
        recordedAt: appointment.surveyHistoryConsentAt || "",
        historyAvailable: true,
      };
    }
    const profile = (await transaction.get(
        db.doc(`profiles/${ctx.therapy.pacienteUid}`),
    )).data();
    const reason = typeof (profile || {}).motivoConsulta === "string" ?
      profile.motivoConsulta.trim() : "";
    const topics = Array.isArray((profile || {}).temas) ?
      profile.temas.filter((topic) => typeof topic === "string") : [];
    const date = profile && (profile.updatedAt || profile.createdAt);
    return {
      status: reason || topics.length ? "available" : "absent",
      reason, topics, source: profile ? "Perfil inicial del paciente" : "",
      recordedAt: date && typeof date.toDate === "function" ?
        date.toDate().toISOString() : typeof date === "string" ? date : "",
      historyAvailable: false,
    };
  });
}

async function getTherapySharedHistory(request) {
  const db = firestoreAdmin.getFirestore();
  const access = await db.runTransaction(async (transaction) => {
    const ctx = await context(request, transaction, request.data.therapyId);
    if (ctx.mode !== "psychologist") {
      throw new HttpsError(
          "permission-denied",
          "El historial compartido requiere una cita confirmada.",
      );
    }
    const appointment = await findSurveySharingAppointment(
        transaction, db, ctx);
    return {patientUid: ctx.therapy.pacienteUid,
      appointmentId: appointment.id};
  });
  const pageSize = Math.min(
      Math.max(Number(request.data.pageSize) || 50, 1), 100,
  );
  let messagesQuery = db
      .collection(`conversations/${access.patientUid}/messages`)
      .orderBy("createdAt", "asc")
      .orderBy(FieldPath.documentId(), "asc")
      .limit(pageSize + 1);
  const cursor = typeof request.data.cursor === "string" ?
    request.data.cursor.trim() : "";
  if (cursor) {
    const cursorSnapshot = await db.doc(
        `conversations/${access.patientUid}/messages/${id(cursor)}`).get();
    if (!cursorSnapshot.exists) {
      throw new HttpsError(
          "aborted", "El historial cambió. Vuelve a cargarlo.",
      );
    }
    messagesQuery = messagesQuery.startAfter(cursorSnapshot);
  }
  const snapshot = await messagesQuery.get();
  const docs = snapshot.docs.slice(0, pageSize);
  return {
    appointmentId: access.appointmentId,
    items: docs.map((doc) => ({
      id: doc.id,
      role: doc.data().role === "assistant" ? "assistant" : "user",
      text: text(doc.data().text || ""),
      sessionId: typeof doc.data().sessionId === "string" ?
        doc.data().sessionId : "",
      createdAt: timestampIso(doc.data().createdAt),
    })),
    nextCursor: snapshot.size > pageSize ? docs.at(-1)?.id || "" : "",
  };
}

async function findSurveySharingAppointment(transaction, db, ctx) {
  const snapshot = await transaction.get(db.collection("citas")
      .where("terapiaId", "==", ctx.therapy.id).limit(20));
  const appointment = snapshot.docs
      .map((doc) => ({id: doc.id, ...doc.data()}))
      .find((item) => item.estado === "confirmada" &&
        item.surveyHistoryConsent === true &&
        item.pacienteUid === ctx.therapy.pacienteUid &&
        item.terapeutaId === ctx.therapy.terapeutaId);
  if (!appointment) {
    throw new HttpsError(
        "permission-denied",
        "El historial requiere cita confirmada y consentimiento.",
    );
  }
  return appointment;
}

function timestampIso(value) {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return typeof value === "string" ? value : "";
}

async function createFollowupGoal(request) {
  const data = request.data || {};
  const title = text(data.title || "", 160);
  if (!title) throw new HttpsError("invalid-argument", "Escribe un objetivo.");
  const db = firestoreAdmin.getFirestore();
  const ref = db.collection("therapy_goals").doc();
  return db.runTransaction(async (transaction) => {
    const ctx = await context(request, transaction, data.terapiaId);
    requireActive(ctx);
    const now = FieldValue.serverTimestamp();
    transaction.create(ref, {
      ...identity(ctx), title, description: text(data.description || ""),
      category: text(data.category || "Proceso terapéutico", 100),
      targetDate: text(data.targetDate || "", 10),
      progress: 0, status: "active",
      createdBy: ctx.uid, authorName: ctx.authorName,
      createdAt: now, updatedAt: now, version: 1,
    });
    event(transaction, ctx, ref.id, "goal_created", "Objetivo creado", title);
    return {id: ref.id};
  });
}

async function recordGoalProgress(request) {
  const data = request.data || {};
  const progress = data.progress;
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    throw new HttpsError(
        "invalid-argument", "El avance debe estar entre 0 y 100.",
    );
  }
  const note = text(data.note || "");
  const db = firestoreAdmin.getFirestore();
  const ref = db.doc(`therapy_goals/${id(data.goalId)}`);
  return db.runTransaction(async (transaction) => {
    const goal = (await transaction.get(ref)).data();
    if (!goal) {
      throw new HttpsError(
          "permission-denied", "Objetivo no disponible.",
      );
    }
    const ctx = await context(request, transaction, goal.terapiaId);
    if (goal.pacienteUid !== ctx.therapy.pacienteUid ||
        goal.terapeutaId !== ctx.therapy.terapeutaId) {
      throw new HttpsError(
          "permission-denied", "El objetivo no corresponde a la terapia.",
      );
    }
    // Preserve the existing personal update action, including past therapies.
    if (ctx.mode === "psychologist") requireActive(ctx);
    if ((goal.version || 0) !== data.expectedVersion) {
      throw new HttpsError(
          "aborted", "El objetivo cambió. Actualiza antes de guardar.",
      );
    }
    const status = progress === 100 ? "achieved" : "active";
    const kind = goal.status === "achieved" && status === "active" ?
      "reopened" : progress < (goal.progress || 0) ? "correction" : "progress";
    if (kind !== "progress" && !note) {
      throw new HttpsError(
          "invalid-argument", "Explica la corrección o reapertura.",
      );
    }
    const now = FieldValue.serverTimestamp();
    const version = (goal.version || 0) + 1;
    const entry = {
      progress, status, note, kind, authorUid: ctx.uid,
      authorName: ctx.authorName, createdAt: now, version,
    };
    transaction.create(ref.collection("progress").doc(String(version)), entry);
    transaction.update(ref, {
      progress, status, lastNote: note, version, updatedAt: now,
      ...(!goal.version && goal.lastNote && !goal.legacyNote ?
        {legacyNote: goal.lastNote} : {}),
      achievedAt: status === "achieved" ? new Date().toISOString() : "",
    });
    const type = kind === "reopened" ? "goal_reopened" :
      kind === "correction" ? "goal_corrected" :
      status === "achieved" ? "goal_achieved" : "goal_updated";
    event(transaction, ctx, ref.id, type, "Avance de objetivo",
        `${goal.title}: ${progress}%`, {progress, status, note, kind, version});
    return {id: ref.id, version};
  });
}

async function assignFollowupExercise(request) {
  const data = request.data || {};
  const title = text(data.title || "", 160);
  const instructions = text(data.instructions || "");
  if (!title || !instructions) {
    throw new HttpsError(
        "invalid-argument", "Escribe título e instrucciones.",
    );
  }
  const db = firestoreAdmin.getFirestore();
  const ref = db.collection("exercises").doc();
  return db.runTransaction(async (transaction) => {
    const ctx = await context(request, transaction, data.terapiaId);
    if (ctx.mode !== "psychologist") {
      throw new HttpsError(
          "permission-denied", "La asignación es profesional.",
      );
    }
    requireActive(ctx);
    const now = FieldValue.serverTimestamp();
    transaction.create(ref, {
      ...identity(ctx), title, instructions,
      category: text(data.category || "Seguimiento", 100),
      frequency: text(data.frequency || "", 200),
      dueDate: text(data.dueDate || "", 10),
      status: "assigned", patientNotes: "",
      createdBy: ctx.uid, authorName: ctx.authorName,
      assignedAt: new Date().toISOString(), createdAt: now, updatedAt: now,
    });
    event(transaction, ctx, ref.id,
        "exercise_assigned", "Ejercicio asignado", title);
    return {id: ref.id};
  });
}

async function completeFollowupExercise(request) {
  const data = request.data || {};
  const db = firestoreAdmin.getFirestore();
  const ref = db.doc(`exercises/${id(data.exerciseId)}`);
  return db.runTransaction(async (transaction) => {
    const exercise = (await transaction.get(ref)).data();
    if (!exercise) {
      throw new HttpsError(
          "permission-denied", "Ejercicio no disponible.",
      );
    }
    const ctx = await context(request, transaction, exercise.terapiaId);
    if (ctx.mode !== "patient" || exercise.pacienteUid !== ctx.uid ||
        exercise.terapeutaId !== ctx.therapy.terapeutaId) {
      throw new HttpsError(
          "permission-denied", "Solo el paciente puede completarlo.",
      );
    }
    if (exercise.status === "completed") {
      throw new HttpsError(
          "failed-precondition", "Este ejercicio ya fue completado.",
      );
    }
    const completedAt = new Date().toISOString();
    transaction.update(ref, {
      status: "completed", patientNotes: text(data.patientNotes || ""),
      completedAt, completedBy: ctx.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    event(transaction, ctx, ref.id,
        "exercise_completed", "Ejercicio completado", exercise.title);
    return {id: ref.id, completedAt};
  });
}

async function createEmotionalCheckin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const data = request.data || {};
  if (data.mode !== "patient") {
    throw new HttpsError(
        "permission-denied", "El registro es personal del paciente.",
    );
  }
  // Never accept identity or authorship supplied by a client.
  const allowed = ["mode", "terapiaId", "requestId", "mood", "intensity",
    "energy", "sleepQuality", "note", "tags"];
  if (Object.keys(data).some((key) => !allowed.includes(key))) {
    throw new HttpsError(
        "permission-denied", "La identidad se obtiene del proceso autorizado.",
    );
  }
  const payload = {
    mood: text(data.mood || "", 80), note: text(data.note || ""),
  };
  if (!payload.mood) {
    throw new HttpsError("invalid-argument", "Selecciona un estado.");
  }
  for (const key of ["intensity", "energy", "sleepQuality"]) {
    if (!Number.isInteger(data[key]) || data[key] < 1 || data[key] > 10) {
      throw new HttpsError(
          "invalid-argument", "Las escalas deben estar entre 1 y 10.",
      );
    }
    payload[key] = data[key];
  }
  if (!Array.isArray(data.tags) || data.tags.length > 12) {
    throw new HttpsError("invalid-argument", "Revisa los temas del registro.");
  }
  payload.tags = data.tags.map((tag) => text(tag, 60));
  const requestId = id(data.requestId);
  const therapyId = id(data.terapiaId);
  const hash = createHash("sha256")
      .update(JSON.stringify({therapyId, payload})).digest("hex");
  const db = firestoreAdmin.getFirestore();
  const ref = db.doc(`emotional_checkins/${request.auth.uid}_${requestId}`);
  return db.runTransaction(async (transaction) => {
    const ctx = await context(request, transaction, therapyId);
    requireActive(ctx);
    const therapist = (await transaction.get(
        db.doc(`therapists/${id(ctx.therapy.terapeutaId)}`),
    )).data();
    if (!therapist) {
      throw new HttpsError(
          "failed-precondition", "El proceso no tiene profesional vinculado.",
      );
    }
    const existing = await transaction.get(ref);
    if (existing.exists) {
      if (existing.data().requestHash !== hash) {
        throw new HttpsError(
            "aborted", "El reintento no corresponde al mismo registro.",
        );
      }
      return {id: ref.id};
    }
    const trustedIdentity = {...identity(ctx), pacienteNombre: ctx.authorName,
      terapeutaNombre: therapist.nombre || ""};
    const now = FieldValue.serverTimestamp();
    transaction.create(ref, {
      ...trustedIdentity, ...payload, requestHash: hash,
      createdBy: ctx.uid, authorName: ctx.authorName,
      createdAt: now, updatedAt: now,
    });
    transaction.create(db.doc(`longitudinal_history/emotion_${ref.id}`), {
      ...trustedIdentity, sourceId: ref.id, sourceType: "emotional_checkin",
      eventType: "emotional_checkin_created",
      title: "Registro emocional agregado",
      summary: `Estado registrado: ${payload.mood}, ` +
        `intensidad ${payload.intensity}/10.`,
      metadata: {checkinId: ref.id, ...payload, note: ""},
      visibility: "patient", createdBy: ctx.uid, authorName: ctx.authorName,
      occurredAt: new Date().toISOString(), createdAt: now,
    });
    return {id: ref.id};
  });
}

module.exports = {
  getTherapySharedHistory, getTherapySharedSummary,
  createFollowupGoal, recordGoalProgress,
  assignFollowupExercise, completeFollowupExercise, createEmotionalCheckin,
};
