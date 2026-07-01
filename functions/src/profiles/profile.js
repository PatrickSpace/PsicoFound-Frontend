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
};

const PROFILE_KEYS = Object.keys(PROFILE_DEFAULTS);
const MODEL_WRITABLE_PROFILE_KEYS = PROFILE_KEYS.filter(
    (key) => !["completado", "sessionId"].includes(key),
);
const OPTIONAL_PREFERENCE_FIELDS = new Set([
  "enfoque",
  "modalidad",
  "preferenciaEdad",
  "preferenciaGenero",
]);
const PROFILE_READY_TEXT = {
  modalidad:
    "Prefieres atencion online, presencial, hibrida o te es indiferente?",
  preferenciaGenero: [
    "Tienes alguna preferencia sobre el genero del terapeuta",
    "o te es indiferente?",
  ].join(" "),
  preferenciaEdad:
    "Tienes alguna preferencia sobre el rango de edad del terapeuta?",
  temas: [
    "Cual es el motivo principal por el que buscas apoyo?",
    "Tambien puedes decirme si solo quieres conversar con un terapeuta.",
  ].join(" "),
  enfoque: [
    "Para el estilo de ayuda, prefieres algo practico con herramientas,",
    "un espacio de escucha profunda, trabajar vinculos/familia, o una mezcla?",
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
    {label: "Cualquier alternativa", value: "Me da igual"},
  ],
  preferenciaGenero: [
    {label: "Mujer", value: "Femenino"},
    {label: "Hombre", value: "Masculino"},
    {label: "Cualquier alternativa", value: "Me da igual"},
  ],
  enfoque: [
    {label: "Algo práctico", value: "Algo práctico con herramientas"},
    {label: "Escucha profunda", value: "Un espacio de escucha profunda"},
    {label: "Vínculos/familia", value: "Trabajar vínculos o familia"},
    {label: "Mezcla flexible", value: "Una mezcla flexible"},
    {label: "Cualquier alternativa", value: "Me da igual"},
  ],
  preferenciaEdad: [
    {label: "25-35", value: "25-35"},
    {label: "35-45", value: "35-45"},
    {label: "+45", value: "+45"},
    {label: "Cualquier alternativa", value: "Me da igual"},
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
      profile[key] = Boolean(value);
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
  if (profile.riesgoSuicida) {
    return true;
  }

  if (profile.soloConversar) {
    return [
      profile.modalidad,
      profile.preferenciaGenero,
      profile.preferenciaEdad,
    ].every(hasTextValue);
  }

  return (
    Array.isArray(profile.temas) &&
    profile.temas.length > 0 &&
    hasTextValue(profile.modalidad) &&
    hasTextValue(profile.preferenciaGenero) &&
    hasTextValue(profile.enfoque) &&
    hasTextValue(profile.preferenciaEdad)
  );
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
  if (profile.riesgoSuicida) {
    return "";
  }

  if (profile.soloConversar) {
    return ["modalidad", "preferenciaGenero", "preferenciaEdad"].find(
        (field) => !hasTextValue(profile[field]),
    ) || "";
  }

  if (!Array.isArray(profile.temas) || profile.temas.length === 0) {
    return "temas";
  }

  return [
    "modalidad",
    "preferenciaGenero",
    "enfoque",
    "preferenciaEdad",
  ].find((field) => !hasTextValue(profile[field])) || "";
}

function hasTextValue(value) {
  return (value || "").toString().trim().length > 0;
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
  sanitizeModelProfileData,
  sanitizeProfileData,
};
