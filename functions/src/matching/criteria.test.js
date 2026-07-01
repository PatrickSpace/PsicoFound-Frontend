const test = require("node:test");
const assert = require("node:assert/strict");
const {buildSearchCriteriaFromProfile} = require("./criteria");

test("criterios indiferentes no filtran modalidad, genero, edad ni enfoque", () => {
  const criteria = buildSearchCriteriaFromProfile({
    temas: ["Ansiedad"],
    modalidad: "indiferente",
    preferenciaGenero: "me da igual",
    preferenciaEdad: "no importa",
    enfoque: "sin preferencia",
  });

  assert.deepEqual(criteria, {
    especialidades: ["Ansiedad"],
    enfoque: "",
    genero: "",
    modalidad: "",
    edad: "",
  });
});

test("solo conversar no filtra por tema ni enfoque", () => {
  const criteria = buildSearchCriteriaFromProfile({
    soloConversar: true,
    temas: ["Ansiedad"],
    modalidad: "Online",
    preferenciaGenero: "Femenino",
    preferenciaEdad: "35-45",
    enfoque: "Cognitivo-Conductual",
  });

  assert.deepEqual(criteria, {
    especialidades: [],
    enfoque: "",
    genero: "femenino",
    modalidad: "remoto",
    edad: "35-45",
  });
});

test("riesgo suicida no aplica filtros de matching", () => {
  const criteria = buildSearchCriteriaFromProfile({
    riesgoSuicida: true,
    temas: ["Ansiedad"],
    modalidad: "Presencial",
    preferenciaGenero: "Masculino",
    preferenciaEdad: "+45",
    enfoque: "Humanista",
  });

  assert.deepEqual(criteria, {
    especialidades: [],
    enfoque: "",
    genero: "",
    modalidad: "",
    edad: "",
  });
});
