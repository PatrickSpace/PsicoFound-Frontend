import { adminApps, adminAuth, adminFirestore } from "./admin-sdk.mjs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
export const projectId = "demo-lurems-followup";
export const password = "SyntheticOnly-2026!";
export const accounts = {
  A: { uid: "professional-a", nombre: "Profesional A", roles: ["patient", "psychologist"] },
  B: { uid: "patient-b", nombre: "Paciente B", roles: ["patient"] },
  C: { uid: "patient-c", nombre: "Paciente C", roles: ["patient"] },
  D: { uid: "professional-d", nombre: "Profesional D", roles: ["patient", "psychologist"] },
  X: { uid: "unlinked-x", nombre: "Sin vínculo X", roles: ["patient"] },
};
function emulatorAdmin() {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST || "", /^(127\.0\.0\.1|localhost):\d+$/);
  assert.equal(process.env.GCLOUD_PROJECT, projectId, "Only the synthetic demo project is allowed");
  const app = adminApps.getApps()[0] || adminApps.initializeApp({ projectId });
  assert.equal(app.options.projectId, projectId, "The Admin app must also target the demo project");
  return app;
}
export async function seedFollowup({ therapySelectionCases = false } = {}) {
  assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST || "", /^(127\.0\.0\.1|localhost):\d+$/);
  const app = emulatorAdmin();
  const db = adminFirestore.getFirestore(app);
  const reset = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: "DELETE" });
  assert.equal(reset.ok, true, "Reset is restricted to the demo emulator database");
  for (const user of Object.values(accounts)) {
    const email = `${user.uid}@example.test`;
    try { await adminAuth.getAuth(app).createUser({ uid: user.uid, email, password, displayName: user.nombre, emailVerified: true }); }
    catch (error) {
      if (error.code !== "auth/uid-already-exists") throw error;
      await adminAuth.getAuth(app).updateUser(user.uid, { emailVerified: true });
    }
    await db.doc(`users/${user.uid}`).set({ ...user, id: user.uid, email, onboardingStatus: "complete", patientOnboardingStatus: "complete",
      fechaNacimiento: "1990-01-01", legalAcceptance: {version: "review-2026-10-06", termsUrl: "https://example.test/terms",
        privacyUrl: "https://example.test/privacy", acceptedAt: "2026-10-09"} });
  }
  await db.doc("therapists/therapist-a").set({ uid: accounts.A.uid, nombre: accounts.A.nombre, activo: true });
  await db.doc("therapists/therapist-d").set({ uid: accounts.D.uid, nombre: accounts.D.nombre, activo: true });
  const therapies = [
    ["b-active", "B", "A", "activo"], ["b-old", "B", "A", "pausa"],
    ["c-old", "C", "A", "finalizado"], ["a-personal", "A", "D", "activo"],
    ["b-other", "B", "D", "finalizado"],
  ];
  if (therapySelectionCases) therapies.push(
    ["b-earlier", "B", "A", "pausa", "2026-06-11T12:00:00.000Z"],
    ["b-without-date", "B", "A", "pausa", null],
    ["b-invalid-date", "B", "A", "pausa", "not-a-date"],
  );
  for (const [id, patient, therapist, estado, fechaCreacion = "2026-08-01T12:00:00.000Z"] of therapies) {
    const identity = { terapiaId: id, pacienteUid: accounts[patient].uid, pacienteNombre: accounts[patient].nombre,
      terapeutaId: therapist === "A" ? "therapist-a" : "therapist-d", terapeutaNombre: accounts[therapist].nombre };
    const cita = { citaId: `session-${id}`, fecha: "2026-09-20", hora: "10:00", estado: "realizada", modalidad: "remoto",
      sessionSummary: `Resumen compartido ${id}`, completedAt: "2026-09-20T16:00:00.000Z", completedBy: accounts[therapist].nombre };
    await db.doc(`terapias/${id}`).set({ ...identity, estado, pacienteEmail: `${accounts[patient].uid}@example.test`,
      ...(fechaCreacion === null ? {} : { fechaCreacion }), citas: [cita] });
    await db.doc(`citas/${cita.citaId}`).set({ ...identity, ...cita });
    if (["b-active", "b-old"].includes(id)) {
      await db.doc(`citas/survey-share-${id}`).set({
        ...identity,
        citaId: `survey-share-${id}`,
        estado: "confirmada",
        surveyHistoryConsent: true,
        surveyHistoryConsentAt: "2026-10-21T12:00:00.000Z",
        surveySummarySnapshot: {
          motivoConsulta: "Motivo compartido de B",
          soloConversar: false,
          temas: ["Ansiedad"],
          modalidad: "remoto",
          preferenciaGenero: "Indiferente",
          preferenciaEdad: "Indiferente",
          enfoque: "Indiferente",
        },
      });
    }
    await db.doc(`longitudinal_history/event-${id}`).set({ ...identity, eventType: "appointment_completed", sourceType: "appointment",
      sourceId: cita.citaId, title: `Sesión ${id}`, summary: `Evento ${id}`, occurredAt: cita.completedAt, createdBy: accounts[therapist].uid });
    if (id !== "b-active") {
      await db.doc(`therapy_goals/goal-${id}`).set({ ...identity, title: `Objetivo ${id}`, description: "Meta sintética previa",
        progress: 20, status: "active", lastNote: "Nota antigua sin historial", createdBy: accounts[therapist].uid });
      await db.doc(`exercises/exercise-${id}`).set({ ...identity, title: `Ejercicio ${id}`, instructions: "Instrucción sintética previa",
        frequency: "Diario", dueDate: "2026-10-30", assignedAt: "2026-09-01T12:00:00.000Z", status: "assigned", createdBy: accounts[therapist].uid });
    }
  }
  await db.doc(`profiles/${accounts.B.uid}`).set({ motivoConsulta: "Motivo compartido de B", temas: ["Ansiedad"],
    updatedAt: adminFirestore.Timestamp.fromDate(new Date("2026-09-01T12:00:00Z")), observaciones: "PRIVADO-NO-COMPARTIR", riesgoSuicida: true });
  await db.doc(`conversations/${accounts.B.uid}`).set({ privateText: "CONVERSACION-PRIVADA" });
  return app;
}
