const test = require("node:test");
const assert = require("node:assert/strict");
const {findMatchingTherapists} = require("./therapistMatching");
const {buildSearchCriteriaFromProfile} = require("./criteria");

test("18-25 preference respects both inclusive boundaries", () => {
  const therapists = [17, 18, 25, 26].map((edad) => ({id: edad, edad}));
  const criteria = buildSearchCriteriaFromProfile({preferenciaEdad: "18-25"});
  assert.equal(criteria.edad, "18-25");
  assert.deepEqual(findMatchingTherapists(therapists, criteria)
      .map((item) => item.id), [18, 25, 17, 26]);
});

test("existing age preferences still behave the same", () => {
  const therapists = [24, 25, 35, 45, 50].map((edad) => ({edad}));
  for (const [edad, expected] of [
    ["25-35", [25, 35]], ["35-45", [35, 45]], ["+45", [45, 50]],
  ]) {
    const ranked = findMatchingTherapists(therapists, {edad})
        .map((item) => item.edad);
    assert.deepEqual(ranked.slice(0, expected.length), expected);
  }
});

test("ranking preserves approach weight, normalization and stable ties", () => {
  const therapists = [
    {id: "topic", especialidades: ["Depresión"]},
    {id: "approach", enfoque: "Humanista"},
    {id: "all", especialidades: ["Depresión"],
      enfoques: ["Humanista"], modalidad: "virtual", genero: "femenino"},
    {id: "tie", especialidades: ["Depresión"]},
    {id: "none"},
  ];
  const original = JSON.stringify(therapists);
  const criteria = buildSearchCriteriaFromProfile({
    temas: ["depresion"], enfoque: "humanista", modalidad: "online",
    preferenciaGenero: "mujer",
  });
  assert.deepEqual(findMatchingTherapists(therapists, criteria)
      .map((item) => item.id), ["all", "approach", "topic", "tie", "none"]);
  assert.equal(JSON.stringify(therapists), original);
});

test("no criteria returns at most five without requiring topics", () => {
  const therapists = Array.from({length: 8}, (_, id) => ({id}));
  const criteria = buildSearchCriteriaFromProfile({
    soloConversar: true, temas: ["Ansiedad"], enfoque: "Humanista",
  });
  assert.deepEqual(findMatchingTherapists(therapists, criteria),
      therapists.slice(0, 5));
  assert.deepEqual(findMatchingTherapists(null), []);
  assert.deepEqual(findMatchingTherapists([]), []);
});

test("mandatory criteria never get silently relaxed", () => {
  const therapists = [
    {id: "remote-woman", modalidad: "Online", genero: "Femenino"},
    {id: "office-woman", modalidad: "Presencial", genero: "Femenino"},
    {id: "remote-man", modalidad: "Online", genero: "Masculino"},
  ];
  const criteria = buildSearchCriteriaFromProfile({
    modalidad: "Online",
    preferenciaGenero: "Femenino",
  });
  assert.deepEqual(
      findMatchingTherapists(therapists, criteria, ["modalidad", "genero"])
          .map((item) => item.id),
      ["remote-woman"],
  );
});

test("hybrid accepts both; concrete modality stays mandatory", () => {
  const therapists = [
    {id: "remote", modalidad: "Online"},
    {id: "office", modalidad: "Presencial"},
    {id: "hybrid", modalidades: ["Híbrido"]},
    {id: "missing"},
  ];
  assert.deepEqual(findMatchingTherapists(therapists,
      {modalidad: "Híbrido"}, ["modalidad"]).map((item) => item.id),
  ["remote", "office", "hybrid"]);
  assert.deepEqual(findMatchingTherapists(therapists,
      {modalidad: "Online"}, ["modalidad"]).map((item) => item.id),
  ["remote", "hybrid"]);
});
