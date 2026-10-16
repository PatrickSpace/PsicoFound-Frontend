/* eslint-disable max-len */
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
  /\b(voy a|quiero|planeo)\s+cortarme las venas\b/,
];

function getCrisisResult(message) {
  if (!hasClearSuicideRisk(message)) {
    return null;
  }

  return {
    reply: CRISIS_REPLY,
    data: {
      motivoConsulta: "Se mostraron recursos de ayuda por una expresión del mensaje.",
      soloConversar: false,
      riesgoSuicida: true,
      temas: [],
      enfoque: "indiferente",
      urgencia: "alta",
      observaciones: "Activación automática de recursos; no constituye evaluación clínica.",
      completado: true,
    },
  };
}

function hasClearSuicideRisk(message) {
  // Limited phrase routing, not a clinical classifier. Quoted/reported/historical
  // language does not establish current first-person intent. Help stays visible.
  const normalized = normalizeForMatching(message)
      .replace(/"[^"]*"|“[^”]*”|«[^»]*»/g, " ");
  return normalized.split(/[.!?;\n]+|\bpero ahora\b|\bpero yo\b/).some((clause) => {
    if (/\b(no|nunca|jamas|antes|ayer|pasado|recuerdo|decia|dije|pensaba|hipoteticamente|quizas|tal vez|si algun dia)\b/.test(clause)) return false;
    if (/\b(mi amigo|mi amiga|mi hermano|mi hermana|mi paciente|el dice|ella dice|alguien|la pelicula|la cancion)\b/.test(clause)) return false;
    return SUICIDE_RISK_PATTERNS.some((pattern) => pattern.test(clause));
  });
}

module.exports = {
  getCrisisResult,
};
