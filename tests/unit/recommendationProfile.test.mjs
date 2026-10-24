import { test } from "node:test";
import assert from "node:assert/strict";
import { isProfileReadyForRecommendations as ready } from "../../src/utils/recommendationProfile.js";

const complete = {
  temas: ["Ansiedad"], enfoque: "Humanista", modalidad: "online",
  preferenciaGenero: "indiferente", preferenciaEdad: "18-25",
  summaryConfirmed: true,
};

test("readiness requires every answer and the approved summary", () => {
  assert.equal(ready(complete), true);
  for (const field of ["temas", "modalidad"]) {
    assert.equal(ready({ ...complete, [field]: field === "temas" ? [] : " ", completado: true }), false, field);
  }
  assert.equal(ready({...complete, summaryConfirmed: false}), false);
  assert.equal(ready({temas:["Ansiedad"], modalidad:"online"}), false);
  assert.equal(ready({temas:["Ansiedad"], modalidad:"desconocida"}), false);
  assert.equal(ready({...complete, modalidad: "indiferente"}), true);
});

test("talk-only omits specialty and approach but keeps preferences", () => {
  const profile = { ...complete, temas: [], enfoque: "", soloConversar: true };
  assert.equal(ready(profile), true);
  assert.equal(ready({ ...profile, modalidad: "" }), false);
  assert.equal(ready({ soloConversar: true }), false);
});

test("a reset/absent profile never inherits a prior profile", () => {
  assert.equal(ready(complete), true);
  for (const empty of [null, undefined, {}, "", { temas: [], completado: false }]) {
    assert.equal(ready(empty), false);
  }
});

test("a safety signal never becomes matching readiness", () => {
  assert.equal(ready({ riesgoSuicida: true }), false);
  assert.equal(ready({ riesgoSuicida: false }), false);
});
