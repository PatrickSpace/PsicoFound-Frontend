import { test } from "node:test";
import assert from "node:assert/strict";
import { isProfileReadyForRecommendations as ready } from "../../src/utils/recommendationProfile.js";

const complete = {
  temas: ["Ansiedad"], enfoque: "Humanista", modalidad: "online",
  preferenciaGenero: "indiferente", preferenciaEdad: "18-25",
};

test("readiness needs every regular criterion, not just completado", () => {
  assert.equal(ready(complete), true);
  for (const field of Object.keys(complete)) {
    assert.equal(ready({ ...complete, [field]: field === "temas" ? [] : " ", completado: true }), false, field);
  }
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

test("crisis bypass remains available without survey completion", () => {
  assert.equal(ready({ riesgoSuicida: true }), true);
  assert.equal(ready({ riesgoSuicida: false }), false);
});
