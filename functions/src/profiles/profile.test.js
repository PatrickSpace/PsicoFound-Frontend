const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PROFILE_DEFAULTS,
  finalizeProfileForMatching,
  getMissingProfileField,
  getSuggestedOptionsForProfile,
  isProfileComplete,
  sanitizeModelProfileData,
} = require("./profile");

test("saludo o perfil vacio no queda listo para recomendaciones", () => {
  const profile = finalizeProfileForMatching({
    ...PROFILE_DEFAULTS,
    sessionId: "test-session",
  });

  assert.equal(profile.completado, false);
  assert.equal(isProfileComplete(profile), false);
  assert.equal(getMissingProfileField(profile), "temas");
});

test("perfil regular solo queda listo con tema y preferencias requeridas", () => {
  const incompleteProfile = finalizeProfileForMatching({
    ...PROFILE_DEFAULTS,
    temas: ["Ansiedad"],
    modalidad: "Online",
    preferenciaGenero: "indiferente",
    enfoque: "Cognitivo-Conductual",
  });

  assert.equal(incompleteProfile.completado, false);
  assert.equal(getMissingProfileField(incompleteProfile), "preferenciaEdad");

  const completeProfile = finalizeProfileForMatching({
    ...incompleteProfile,
    preferenciaEdad: "indiferente",
  });

  assert.equal(completeProfile.completado, true);
  assert.equal(getMissingProfileField(completeProfile), "");
});

test("solo conversar no exige tema ni enfoque", () => {
  const profile = finalizeProfileForMatching({
    ...PROFILE_DEFAULTS,
    soloConversar: true,
    modalidad: "indiferente",
    preferenciaGenero: "indiferente",
    preferenciaEdad: "indiferente",
  });

  assert.equal(profile.completado, true);
  assert.equal(getMissingProfileField(profile), "");
});

test("me da igual se normaliza como indiferente en preferencias opcionales", () => {
  const profile = sanitizeModelProfileData({
    modalidad: "me da igual",
    preferenciaGenero: "cualquiera",
    preferenciaEdad: "no importa",
    enfoque: "sin preferencia",
    motivoConsulta: "Me siento ansioso por el trabajo",
  });

  assert.equal(profile.modalidad, "indiferente");
  assert.equal(profile.preferenciaGenero, "indiferente");
  assert.equal(profile.preferenciaEdad, "indiferente");
  assert.equal(profile.enfoque, "indiferente");
  assert.equal(profile.motivoConsulta, "Me siento ansioso por el trabajo");
});

test("opciones sugeridas siguen el primer campo faltante", () => {
  const profile = {
    ...PROFILE_DEFAULTS,
    temas: ["Ansiedad"],
    modalidad: "Online",
  };

  const options = getSuggestedOptionsForProfile(profile);

  assert.equal(getMissingProfileField(profile), "preferenciaGenero");
  assert.ok(options.length > 0);
  assert.ok(options.every((option) => option.field === "preferenciaGenero"));
});
