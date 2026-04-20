const PROFILE_DEFAULTS = {
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

    profile[key] = (value || "").toString().trim();
    return profile;
  }, {});
}

function cleanStringArray(value) {
  return value
      .map((item) => (item || "").toString().trim())
      .filter(Boolean)
      .slice(0, 12);
}

module.exports = {
  PROFILE_DEFAULTS,
  getCurrentProfile,
  sanitizeProfileData,
};
