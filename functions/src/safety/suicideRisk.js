const {normalizeForMatching} = require("../utils/text");

const CRISIS_REPLY =
  "Siento mucho que estes pasando por esto. Si estas en Peru y necesitas " +
  "apoyo urgente en salud mental, llama gratis a la Linea 113 Salud, " +
  "opcion 5, disponible las 24 horas. Si estas en peligro inmediato, " +
  "contacta emergencias o acude al establecimiento de salud mas cercano.";

const SUICIDE_RISK_PATTERNS = [
  new RegExp(
      "\\b(quiero|voy a|planeo|pienso|estoy pensando en|estoy por)" +
      "\\s+(matarme|suicidarme)\\b",
  ),
  new RegExp(
      "\\b(quiero|voy a|planeo|pienso|estoy pensando en|estoy por)" +
      "\\s+quitarme la vida\\b",
  ),
  new RegExp(
      "\\b(quiero|voy a|planeo|pienso|estoy pensando en|estoy por)" +
      "\\s+acabar con mi vida\\b",
  ),
  new RegExp(
      "\\b(quiero|voy a|planeo|pienso|estoy pensando en|estoy por)" +
      "\\s+terminar con mi vida\\b",
  ),
  new RegExp(
      "\\b(tengo|ya tengo)\\s+un plan\\b.*\\b" +
      "(suicidarme|matarme|quitarme la vida)\\b",
  ),
  new RegExp(
      "\\b(suicidarme|matarme|quitarme la vida)\\b.*\\b" +
      "(tengo|ya tengo)\\s+un plan\\b",
  ),
  /\b(voy a|quiero|planeo)\s+(cortarme las venas|tomar pastillas)\b/,
];

function getCrisisResult(message) {
  if (!hasClearSuicideRisk(message)) {
    return null;
  }

  return {
    reply: CRISIS_REPLY,
    data: {
      motivoConsulta: "Riesgo suicida expresado por el usuario.",
      soloConversar: false,
      riesgoSuicida: true,
      temas: [],
      enfoque: "indiferente",
      urgencia: "alta",
      observaciones: "Se detecto intencion clara de atentar contra su vida.",
      completado: true,
    },
  };
}

function hasClearSuicideRisk(message) {
  const normalized = normalizeForMatching(message);
  return SUICIDE_RISK_PATTERNS.some((pattern) => pattern.test(normalized));
}

module.exports = {
  getCrisisResult,
  hasClearSuicideRisk,
};
