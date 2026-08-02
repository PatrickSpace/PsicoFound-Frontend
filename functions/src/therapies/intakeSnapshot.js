const INTAKE_TEXT_LIMITS = {
  motivoConsulta: 2000,
  nivelMalestar: 240,
  urgencia: 120,
  modalidad: 120,
  preferenciaGenero: 120,
  preferenciaEdad: 120,
  enfoque: 500,
  observaciones: 3000,
};

function buildIntakeSnapshot(profile = {}, capturedAt = null) {
  return {
    profileSessionId: cleanText(profile.sessionId, 180),
    motivoConsulta: cleanText(
        profile.motivoConsulta,
        INTAKE_TEXT_LIMITS.motivoConsulta,
    ),
    temas: cleanStringArray(profile.temas, 12, 160),
    soloConversar: Boolean(profile.soloConversar),
    riesgoSuicida: Boolean(profile.riesgoSuicida),
    nivelMalestar: cleanText(
        profile.nivelMalestar,
        INTAKE_TEXT_LIMITS.nivelMalestar,
    ),
    urgencia: cleanText(profile.urgencia, INTAKE_TEXT_LIMITS.urgencia),
    modalidad: cleanText(profile.modalidad, INTAKE_TEXT_LIMITS.modalidad),
    preferenciaGenero: cleanText(
        profile.preferenciaGenero,
        INTAKE_TEXT_LIMITS.preferenciaGenero,
    ),
    preferenciaEdad: cleanText(
        profile.preferenciaEdad,
        INTAKE_TEXT_LIMITS.preferenciaEdad,
    ),
    enfoque: cleanText(profile.enfoque, INTAKE_TEXT_LIMITS.enfoque),
    observaciones: cleanText(
        profile.observaciones,
        INTAKE_TEXT_LIMITS.observaciones,
    ),
    capturedAt,
  };
}

function buildInitialTherapyFields(intakeSnapshot = {}) {
  return {
    motivoTerapia: cleanText(intakeSnapshot.motivoConsulta, 2000),
    detalleTerapia: "",
    objetivosIniciales: [],
  };
}

function cleanText(value, maxLength) {
  return (value || "").toString().trim().slice(0, maxLength);
}

function cleanStringArray(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];

  return value
      .map((item) => cleanText(item, maxLength))
      .filter(Boolean)
      .slice(0, maxItems);
}

module.exports = {
  buildInitialTherapyFields,
  buildIntakeSnapshot,
};
