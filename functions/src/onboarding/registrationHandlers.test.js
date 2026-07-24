const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeRegistrationIntent,
  sanitizePatientProfile,
  sanitizeProfessionalApplication,
} = require("./registrationHandlers");

test("normalizes supported registration intents", () => {
  assert.equal(normalizeRegistrationIntent(" patient "), "patient");
  assert.equal(
      normalizeRegistrationIntent("PSYCHOLOGIST"),
      "psychologist",
  );
});

test("rejects unsupported registration intents", () => {
  assert.throws(
      () => normalizeRegistrationIntent("admin"),
      (error) => error.code === "invalid-argument",
  );
});

test("normalizes a valid patient onboarding profile", () => {
  assert.deepEqual(
      sanitizePatientProfile({
        nombre: "  Ana Garcia  ",
        fechaNacimiento: "1993-04-12",
        telefono: " 999 555 111 ",
        pais: " Peru ",
        zonaHoraria: " America/Lima ",
      }),
      {
        nombre: "Ana Garcia",
        fechaNacimiento: "1993-04-12",
        telefono: "999 555 111",
        pais: "Peru",
        zonaHoraria: "America/Lima",
      },
  );
});

test("rejects a patient profile without a valid birth date", () => {
  assert.throws(
      () =>
        sanitizePatientProfile({
          nombre: "Ana Garcia",
          fechaNacimiento: "12/04/1993",
        }),
      (error) => error.code === "invalid-argument",
  );
});

test("normalizes a complete psychologist application", () => {
  const application = sanitizeProfessionalApplication({
    professionalName: " Dra. Ana Garcia ",
    licenseNumber: "CPSP-12345",
    country: "Peru",
    phone: "999555111",
    yearsExperience: 8,
    specialties: ["Ansiedad", "Ansiedad", "Depresion"],
    approaches: ["Humanista"],
    modalities: ["Remoto"],
    professionalSummary: "Acompano procesos de ansiedad.",
  });

  assert.equal(application.professionalName, "Dra. Ana Garcia");
  assert.equal(application.yearsExperience, 8);
  assert.deepEqual(application.specialties, ["Ansiedad", "Depresion"]);
});

test("requires professional credentials before submission", () => {
  assert.throws(
      () =>
        sanitizeProfessionalApplication({
          professionalName: "Dra. Ana Garcia",
          country: "Peru",
          specialties: ["Ansiedad"],
          approaches: ["Humanista"],
          modalities: ["Remoto"],
          professionalSummary: "Resumen profesional",
        }),
      (error) => error.code === "invalid-argument",
  );
});
