import { getFunctions, httpsCallable } from "firebase/functions";
import { app, auth } from "@/plugins/Firebase/firebase";
import { finOpsTracker } from "@/utils/finOpsTracker";
import { CACHE_TTL, getOrFetch } from "@/utils/requestCache";

const FUNCTIONS_REGION =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1";
const functions = getFunctions(app, FUNCTIONS_REGION);
const getRecommendedTherapistsCallable = httpsCallable(
  functions,
  "getRecommendedTherapists"
);

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

export function isProfileReadyForRecommendations(profile = {}) {
  if (!profile || typeof profile !== "object") {
    return false;
  }

  if (Boolean(profile.riesgoSuicida)) {
    return true;
  }

  if (Boolean(profile.soloConversar)) {
    return [
      profile.modalidad,
      profile.preferenciaGenero,
      profile.preferenciaEdad,
    ].every(hasProfileValue);
  }

  const temas = Array.isArray(profile.temas) ? profile.temas : [];

  return (
    temas.length > 0 &&
    hasProfileValue(profile.modalidad) &&
    hasProfileValue(profile.preferenciaGenero) &&
    hasProfileValue(profile.enfoque) &&
    hasProfileValue(profile.preferenciaEdad)
  );
}

export async function getRecommendedTherapists(options = {}) {
  const scope = auth.currentUser?.uid || "anonymous";

  return getOrFetch({
    key: "matching:recommendations",
    scope,
    ttl: CACHE_TTL.MATCHING,
    force: options.force,
    resource: "matching",
    source: "getRecommendedTherapists",
    fetcher: async () => {
      const startedAt = performance.now();

      try {
        const result = await getRecommendedTherapistsCallable();
        finOpsTracker.track({
          type: "external-request",
          resource: "matching",
          source: "getRecommendedTherapists",
          operation: "getRecommendedTherapists",
          durationMs: performance.now() - startedAt,
        });
        return {
          therapists: Array.isArray(result.data?.therapists)
            ? result.data.therapists
            : [],
          profile: result.data?.profile || null,
          criteria: result.data?.criteria || null,
        };
      } catch (error) {
        finOpsTracker.track({
          type: "external-request-error",
          resource: "matching",
          source: "getRecommendedTherapists",
          operation: "getRecommendedTherapists",
          durationMs: performance.now() - startedAt,
          errorType: error?.code || error?.name || "unknown",
        });
        throw createMatchingError(error);
      }
    },
  });
}

function createMatchingError(error) {
  const readableError = new Error(
    error?.message ||
      "No pudimos obtener las recomendaciones. Inténtalo nuevamente."
  );
  readableError.code = error?.code || "";
  return readableError;
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

function hasProfileValue(value) {
  return (value || "").toString().trim().length > 0;
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

function normalizeKey(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
