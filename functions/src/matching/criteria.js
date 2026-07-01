const GENDER_MAP = {
  "hombre": "masculino",
  "masculino": "masculino",
  "mujer": "femenino",
  "femenino": "femenino",
};

const MODALITY_MAP = {
  "hibrida": "hibrido",
  "hibrido": "hibrido",
  "hiibrido": "hibrido",
  "online": "remoto",
  "precencial": "presencial",
  "presencial": "presencial",
  "remota": "remoto",
  "remoto": "remoto",
  "virtual": "remoto",
};

const SPECIALTY_MAP = {
  "ansiedad": "Ansiedad",
  "depresion": "Depresion",
  "trauma infantil": "Trauma infantil",
  "problemas de autoestima": "Problemas de autoestima",
  "problemas de pareja": "Problemas de pareja",
  "ansiedad social": "Ansiedad social",
  "abuso de sustancias": "Abuso de sustancias",
  "problemas laborales": "Problemas laborales",
  "procrastinacion": "Procrastinacion",
  "problemas familiares": "Problemas familiares",
  "problemas de identidad": "Problemas de identidad",
};

const APPROACH_MAP = {
  "humanista": "Humanista",
  "cognitivo-conductual": "Cognitivo-Conductual",
  "cognitivo": "Cognitivo-Conductual",
  "conductual": "Cognitivo-Conductual",
  "tcc": "Cognitivo-Conductual",
  "psicoanalisis": "Psicoanalisis",
  "terapia familiar": "Terapia Familiar",
  "familiar": "Terapia Familiar",
  "integrativo": "Integrativo",
};

const AGE_MAP = {
  "25-35": "25-35",
  "35-45": "35-45",
  "+45": "+45",
  "45+": "+45",
  "+ 45": "+45",
  "mas de 45": "+45",
};

function buildSearchCriteriaFromProfile(profile = {}) {
  const temas = Array.isArray(profile.temas) ? profile.temas : [];
  const soloConversar = Boolean(profile.soloConversar);
  const riesgoSuicida = Boolean(profile.riesgoSuicida);

  if (riesgoSuicida) {
    return {
      especialidades: [],
      enfoque: "",
      genero: "",
      modalidad: "",
      edad: "",
    };
  }

  return {
    especialidades: soloConversar ?
      [] :
      temas
          .map(normalizeSpecialty)
          .filter(Boolean),
    enfoque: soloConversar ? "" : normalizeValue(profile.enfoque, APPROACH_MAP),
    genero: normalizeValue(profile.preferenciaGenero, GENDER_MAP),
    modalidad: normalizeValue(profile.modalidad, MODALITY_MAP),
    edad: normalizeValue(profile.preferenciaEdad, AGE_MAP),
  };
}

function normalizeValue(value, dictionary) {
  const rawValue = (value || "").toString().trim();
  const normalized = normalizeKey(rawValue);

  if (!normalized || isIndifferentValue(normalized)) {
    return "";
  }

  return dictionary[normalized] || rawValue;
}

function normalizeSpecialty(value) {
  const rawValue = (value || "").toString().trim();
  const normalized = normalizeKey(rawValue);

  if (!normalized || isIndifferentValue(normalized)) {
    return "";
  }

  return SPECIALTY_MAP[normalized] || rawValue;
}

function normalizeKey(value) {
  return (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
}

function isIndifferentValue(normalized) {
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
  buildSearchCriteriaFromProfile,
  normalizeKey,
};
