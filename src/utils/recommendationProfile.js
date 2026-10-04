// Readiness is presentation-only. Ranking and filtering run in the callable.
export function isProfileReadyForRecommendations(profile = {}) {
  if (!profile || typeof profile !== "object") return false;
  if (Boolean(profile.riesgoSuicida)) return true;

  const preferences = [
    profile.modalidad,
    profile.preferenciaGenero,
    profile.preferenciaEdad,
  ];
  if (Boolean(profile.soloConversar)) return preferences.every(hasValue);

  return (
    Array.isArray(profile.temas) &&
    profile.temas.length > 0 &&
    [...preferences, profile.enfoque].every(hasValue)
  );
}

function hasValue(value) {
  return (value || "").toString().trim().length > 0;
}
