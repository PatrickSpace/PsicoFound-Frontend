const {hasValidModality} = require("../matching/modality");

const PROFILE_DEFAULTS = {
  sessionId: "",
  motivoConsulta: "",
  soloConversar: false,
  riesgoSuicida: false,
  temas: [],
  enfoque: "",
  preferenciaEdad: "",
  nivelMalestar: "",
  urgencia: "",
  preferenciaGenero: "",
  modalidad: "",
  disponibilidad: [],
  presupuesto: "",
  ciudad: "",
  observaciones: "",
  completado: false,
  summaryConfirmed: false,
};

const PROFILE_KEYS = Object.keys(PROFILE_DEFAULTS);
const MODEL_WRITABLE_PROFILE_KEYS = PROFILE_KEYS.filter(
    (key) => !["completado", "sessionId", "summaryConfirmed"].includes(key),
);
const OPTIONAL_PREFERENCE_FIELDS = new Set([
  "enfoque",
  "modalidad",
  "preferenciaEdad",
  "preferenciaGenero",
]);
const PROFILE_READY_TEXT = {
  modalidad:
    "¿Prefieres atención online, presencial, híbrida o te es indiferente?",
  preferenciaGenero: [
    "¿Tienes alguna preferencia sobre el género del terapeuta",
    "o te es indiferente?",
  ].join(" "),
  preferenciaEdad:
    "¿Tienes alguna preferencia sobre el rango de edad del terapeuta " +
    "o te es indiferente?",
  temas: [
    "Gracias por estar aquí. Puedes contarme con tus propias palabras qué",
    "estás viviendo o elegir una opción. ¿Qué te gustaría compartir hoy?",
  ].join(" "),
  enfoque: [
    "Para el estilo de ayuda, ¿prefieres algo práctico con herramientas,",
    "un espacio de escucha profunda, trabajar vínculos o familia, " +
    "una mezcla flexible o te es indiferente?",
  ].join(" "),
};
const PROFILE_OPTION_SETS = {
  temas: [
    {label: "Ansiedad", value: "Ansiedad"},
    {label: "Depresión", value: "Depresión"},
    {label: "Autoestima", value: "Problemas de autoestima"},
    {label: "Pareja", value: "Problemas de pareja"},
    {label: "Familia", value: "Problemas familiares"},
    {label: "Laboral", value: "Problemas laborales"},
    {label: "Solo conversar", value: "Solo quiero conversar"},
  ],
  modalidad: [
    {label: "Online", value: "Online"},
    {label: "Presencial", value: "Presencial"},
    {label: "Híbrido", value: "Híbrido"},
    {label: "Me da igual", value: "Me da igual"},
  ],
  preferenciaGenero: [
    {label: "Mujer", value: "Femenino"},
    {label: "Hombre", value: "Masculino"},
    {label: "Me da igual", value: "Me da igual"},
  ],
  enfoque: [
    {label: "Algo práctico", value: "Algo práctico con herramientas"},
    {label: "Escucha profunda", value: "Un espacio de escucha profunda"},
    {label: "Vínculos/familia", value: "Trabajar vínculos o familia"},
    {label: "Mezcla flexible", value: "Una mezcla flexible"},
    {label: "Me da igual", value: "Me da igual"},
  ],
  preferenciaEdad: [
    {label: "25-35", value: "25-35"},
    {label: "35-45", value: "35-45"},
    {label: "+45", value: "+45"},
    {label: "Me da igual", value: "Me da igual"},
  ],
};

async function getCurrentProfile(profileRef) {
  const profileSnap = await profileRef.get();
  const savedProfile = profileSnap.exists ? profileSnap.data() : {};

  return {
    ...PROFILE_DEFAULTS,
    ...sanitizeProfileData(savedProfile),
  };
}

function sanitizeProfileData(data = {}) {
  return PROFILE_KEYS.reduce((profile, key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      return profile;
    }

    const value = data[key];

    if (Array.isArray(PROFILE_DEFAULTS[key])) {
      profile[key] = Array.isArray(value) ? cleanStringArray(value) : [];
      return profile;
    }

    if (typeof PROFILE_DEFAULTS[key] === "boolean") {
      profile[key] = Boolean(value);
      return profile;
    }

    profile[key] = sanitizeTextValue(key, value);
    return profile;
  }, {});
}

function sanitizeModelProfileData(data = {}) {
  return MODEL_WRITABLE_PROFILE_KEYS.reduce((profile, key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      return profile;
    }

    const value = data[key];

    if (Array.isArray(PROFILE_DEFAULTS[key])) {
      profile[key] = Array.isArray(value) ? cleanStringArray(value) : [];
      return profile;
    }

    if (typeof PROFILE_DEFAULTS[key] === "boolean") {
      if (typeof value === "boolean") profile[key] = value;
      return profile;
    }

    profile[key] = sanitizeTextValue(key, value);
    return profile;
  }, {});
}

function cleanStringArray(value) {
  return value
      .map((item) => (item || "").toString().trim())
      .filter(Boolean)
      .slice(0, 12);
}

function finalizeProfileForMatching(profile = {}) {
  return {
    ...profile,
    completado: isProfileComplete(profile),
  };
}

function isProfileComplete(profile = {}) {
  const hasTopic = Boolean(profile.soloConversar) ||
    (Array.isArray(profile.temas) && profile.temas.length > 0);
  const practicalPreferences = [
    profile.preferenciaGenero,
    profile.preferenciaEdad,
  ].every(hasPreferenceValue);
  const hasApproach = Boolean(profile.soloConversar) ||
    hasPreferenceValue(profile.enfoque);

  return hasTopic && hasValidModality(profile.modalidad) &&
    practicalPreferences && hasApproach;
}

function getNextProfileQuestion(profile = {}) {
  const missingField = getMissingProfileField(profile);

  if (!missingField) {
    return "";
  }

  return PROFILE_READY_TEXT[missingField] || "";
}

function getSuggestedOptionsForProfile(profile = {}) {
  const missingField = getMissingProfileField(profile);

  if (!missingField) {
    return [];
  }

  return (PROFILE_OPTION_SETS[missingField] || []).map((option) => ({
    ...option,
    field: missingField,
  }));
}

function getMissingProfileField(profile = {}) {
  if (!profile.soloConversar &&
      (!Array.isArray(profile.temas) || profile.temas.length === 0)) {
    return "temas";
  }
  if (!hasValidModality(profile.modalidad)) return "modalidad";
  if (!hasPreferenceValue(profile.preferenciaGenero)) {
    return "preferenciaGenero";
  }
  if (!hasPreferenceValue(profile.preferenciaEdad)) return "preferenciaEdad";
  if (!profile.soloConversar && !hasPreferenceValue(profile.enfoque)) {
    return "enfoque";
  }
  return "";
}

function hasPreferenceValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeTextValue(key, value) {
  const cleanValue = (value || "").toString().trim();

  if (OPTIONAL_PREFERENCE_FIELDS.has(key) && isIndifferentValue(cleanValue)) {
    return "indiferente";
  }

  return cleanValue;
}

function isIndifferentValue(value) {
  const normalized = (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  return [
    "indiferente",
    "me es indiferente",
    "me da igual",
    "da igual",
    "igual",
    "cualquiera",
    "sin preferencia",
    "no tengo preferencia",
    "no importa",
  ].includes(normalized);
}

module.exports = {
  PROFILE_DEFAULTS,
  finalizeProfileForMatching,
  getMissingProfileField,
  getNextProfileQuestion,
  getSuggestedOptionsForProfile,
  getCurrentProfile,
  isProfileComplete,
  isIndifferentValue,
  sanitizeModelProfileData,
};
