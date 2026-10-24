/* eslint-disable max-len */
const {randomUUID} = require("node:crypto");
const {HttpsError} = require("firebase-functions/v2/https");
const {getMissingProfileField, getNextProfileQuestion, getSuggestedOptionsForProfile} = require("../profiles/profile");
const normalize = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
function makeTurn(profile, sessionId, confirmation = false) {
  if (confirmation && typeof confirmation === "object") {
    const field = confirmation.field;
    return {id: randomUUID(), sessionId, field, kind: "overwrite_confirmation",
      status: "active", pendingData: confirmation.data,
      pendingConflicts: confirmation.pendingConflicts || [],
      question: `Antes tenía registrado ${formatValue(confirmation.previous)}. ¿Quieres cambiarlo por ${formatValue(confirmation.next)}?`,
      options: [{label: "Sí, cambiarlo", value: "Sí", field}, {label: "No, mantenerlo", value: "No", field}]};
  }
  const field = confirmation ? "soloConversar" : getMissingProfileField(profile);
  return {id: randomUUID(), sessionId, field, kind: confirmation ? "confirmation" : "question",
    status: field ? "active" : "complete",
    question: confirmation ? "¿Buscas principalmente conversar sin centrarte en un problema específico?" : getNextProfileQuestion(profile),
    options: confirmation ? [{label: "Sí", value: "Sí", field}, {label: "No", value: "No", field}] : getSuggestedOptionsForProfile(profile)};
}
function validateTurn(data, conversation) {
  if (data.sessionId && data.sessionId !== conversation.activeSessionId) throw new HttpsError("aborted", "La sesión cambió. Revisa la conversación actual.");
  if (data.turnId && data.turnId !== conversation.activeTurn?.id) throw new HttpsError("aborted", "La pregunta cambió. Usa las opciones actuales.");
  if (data.option && (!data.turnId || data.option.field !== conversation.activeTurn?.field ||
      !conversation.activeTurn.options.some((o) => o.field === data.option.field && o.value === data.option.value))) {
    throw new HttpsError("failed-precondition", "La opción no pertenece a la pregunta actual.");
  }
}
function localAnswer(message, turn) {
  const text = normalize(message); const field = turn?.field;
  if (/^(no se|no estoy segur[oa]|no lo se)$/.test(text)) return {data: {}, uncertain: true};
  if (turn?.kind === "confirmation" && /^(si|no)$/.test(text)) {
    return {data: {soloConversar: text === "si", ...(text === "si" ? {temas: [], enfoque: "indiferente"} : {})}};
  }
  if (turn?.kind === "overwrite_confirmation" && /^(si|no)$/.test(text)) {
    return {data: text === "si" ? turn.pendingData || {} : {},
      confirmedOverwrite: text === "si",
      nextConfirmation: nextPendingConfirmation(turn.pendingConflicts)};
  }
  if (["solo quiero conversar", "solo conversar"].includes(text.replace(/[.!]+$/, ""))) return {data: {soloConversar: true, temas: [], enfoque: "indiferente"}};
  if (["hola", "buenas", "buenos dias", "buenas tardes"].includes(text)) return {data: {}};
  if (field && ["modalidad", "preferenciaGenero", "preferenciaEdad", "enfoque"].includes(field) &&
      ["me da igual", "indiferente", "sin preferencia", "cualquier alternativa"].includes(text)) return {data: {[field]: "indiferente"}};
  const option = turn?.options?.find((o) => normalize(o.value) === text || normalize(o.label) === text);
  if (!option) return null;
  const values = {"Online": "online", "Presencial": "presencial", "Híbrido": "hibrido", "Algo práctico con herramientas": "Cognitivo-Conductual",
    "Un espacio de escucha profunda": "Humanista", "Trabajar vínculos o familia": "Terapia Familiar", "Una mezcla flexible": "Integrativo"};
  return {data: field === "temas" ? {temas: [option.value], motivoConsulta: option.value} : {[field]: values[option.value] || option.value}};
}
function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value || "una respuesta anterior");
}
function nextPendingConfirmation(conflicts = []) {
  if (!conflicts.length) return null;
  return {...conflicts[0], pendingConflicts: conflicts.slice(1)};
}
module.exports = {makeTurn, validateTurn, localAnswer};
