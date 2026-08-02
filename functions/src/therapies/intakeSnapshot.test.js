const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildInitialTherapyFields,
  buildIntakeSnapshot,
} = require("./intakeSnapshot");

test("intake snapshot copies only the recommendation profile contract", () => {
  const capturedAt = {seconds: 123};
  const snapshot = buildIntakeSnapshot({
    sessionId: "profile-session-1",
    motivoConsulta: " Ansiedad laboral ",
    temas: ["Ansiedad", "Trabajo", ""],
    soloConversar: false,
    riesgoSuicida: false,
    nivelMalestar: "alto",
    urgencia: "media",
    modalidad: "online",
    preferenciaGenero: "indiferente",
    preferenciaEdad: "35-45",
    enfoque: "práctico",
    observaciones: "Prefiere tardes",
    completado: true,
    privateModelMetadata: "must-not-leak",
  }, capturedAt);

  assert.deepEqual(snapshot, {
    profileSessionId: "profile-session-1",
    motivoConsulta: "Ansiedad laboral",
    temas: ["Ansiedad", "Trabajo"],
    soloConversar: false,
    riesgoSuicida: false,
    nivelMalestar: "alto",
    urgencia: "media",
    modalidad: "online",
    preferenciaGenero: "indiferente",
    preferenciaEdad: "35-45",
    enfoque: "práctico",
    observaciones: "Prefiere tardes",
    capturedAt,
  });
});

test("buildInitialTherapyFields creates an independent clinical record", () => {
  const fields = buildInitialTherapyFields({
    motivoConsulta: "Necesito apoyo con ansiedad",
  });

  assert.deepEqual(fields, {
    motivoTerapia: "Necesito apoyo con ansiedad",
    detalleTerapia: "",
    objetivosIniciales: [],
  });
});
