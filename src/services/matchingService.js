const GENDER_MAP = {
  hombre: "masculino",
  masculino: "masculino",
  mujer: "femenino",
  femenino: "femenino",
};

const MODALITY_MAP = {
  online: "remoto",
  remota: "remoto",
  remoto: "remoto",
  virtual: "remoto",
  presencial: "presencial",
  hibrida: "hibrido",
  "híbrida": "hibrido",
  hibrido: "hibrido",
  "híbrido": "hibrido",
};

const SPECIALTY_MAP = {
  ansiedad: "Ansiedad",
  depresion: "Depresión",
  "trauma infantil": "Trauma infantil",
  "problemas de autoestima": "Problemas de autoestima",
  "problemas de pareja": "Problemas de pareja",
  "ansiedad social": "Ansiedad social",
  "abuso de sustancias": "Abuso de sustancias",
  "problemas laborales": "Problemas laborales",
  procrastinacion: "Procrastinación",
  "problemas familiares": "Problemas familiares",
  "problemas de identidad": "Problemas de identidad",
};

const APPROACH_MAP = {
  humanista: "Humanista",
  "cognitivo-conductual": "Cognitivo-Conductual",
  cognitivo: "Cognitivo-Conductual",
  conductual: "Cognitivo-Conductual",
  tcc: "Cognitivo-Conductual",
  psicoanalisis: "Psicoanálisis",
  "terapia familiar": "Terapia Familiar",
  familiar: "Terapia Familiar",
  integrativo: "Integrativo",
};

const AGE_MAP = {
  "18-25": "18-25",
  "25-35": "25-35",
  "35-45": "35-45",
  "+45": "+45",
  "45+": "+45",
  "+ 45": "+45",
  "mas de 45": "+45",
};

export function buildSearchCriteriaFromProfile(profile = {}) {
  const temas = Array.isArray(profile.temas) ? profile.temas : [];
  const soloConversar = Boolean(profile.soloConversar);

  return {
    especialidades: soloConversar
      ? []
      : temas
        .map(normalizeSpecialty)
        .filter(Boolean),
    enfoque: soloConversar ? "" : normalizeValue(profile.enfoque, APPROACH_MAP),
    genero: normalizeValue(profile.preferenciaGenero, GENDER_MAP),
    modalidad: normalizeValue(profile.modalidad, MODALITY_MAP),
    edad: normalizeValue(profile.preferenciaEdad, AGE_MAP),
  };
}

export function applyProfileToTerapiaStore(profile, terapiaStore) {
  if (!terapiaStore || typeof terapiaStore.setCriteriosBusqueda !== "function") {
    return;
  }

  terapiaStore.setCriteriosBusqueda(buildSearchCriteriaFromProfile(profile));
}

function normalizeValue(value, dictionary) {
  const rawValue = (value || "").toString().trim();
  const normalized = normalizeKey(rawValue);

  if (!normalized || normalized.includes("indiferente")) {
    return "";
  }

  return dictionary[normalized] || rawValue;
}

function normalizeSpecialty(value) {
  const rawValue = (value || "").toString().trim();
  const normalized = normalizeKey(rawValue);

  if (!normalized || normalized.includes("indiferente")) {
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
