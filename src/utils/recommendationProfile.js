// Readiness is presentation-only. Ranking and filtering run in the callable.
export function isProfileReadyForRecommendations(profile = {}) {
  if (!profile || typeof profile !== "object") return false;
  if (Boolean(profile.riesgoSuicida)) return true;

  const modality = String(profile.modalidad || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const hasModality = ["online", "remoto", "remota", "virtual", "presencial", "precencial",
    "hibrido", "hibrida", "hiibrido", "indiferente", "me da igual", "me es indiferente", "sin preferencia"].includes(modality);
  return hasModality && (Boolean(profile.soloConversar) ||
    (Array.isArray(profile.temas) && profile.temas.length > 0));
}
