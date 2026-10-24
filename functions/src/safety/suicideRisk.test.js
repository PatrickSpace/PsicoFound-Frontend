const test = require("node:test");
const assert = require("node:assert/strict");
const {getCrisisResult} = require("./suicideRisk");
// Technical cases only. Clinical expectations need separate approval.
for (const text of ["Quiero suicidarme", "Voy a quitarme la vida",
  "Ya tengo un plan para matarme",
  "Antes no quería, pero ahora quiero suicidarme"]) {
  test(`explicit current phrase routes to resources: ${text}`, () => {
    const result = getCrisisResult(text);
    assert.equal(result.riskSignal, "literal");
    assert.equal(result.data, undefined);
    assert.match(result.reply, /113/);
    assert.doesNotMatch(result.reply, /vigilamos|responderemos|diagnostico/);
  });
}
for (const text of ["No quiero suicidarme", "Nunca quiero matarme",
  "Mi amigo dice que quiero suicidarme", "Ella dice \"quiero suicidarme\"",
  "Antes decía quiero suicidarme", "Ayer dije quiero matarme",
  "No sé si quiero suicidarme", "Quizás quiero matarme",
  "Quiero tomar pastillas", "Me siento mal", "No quiero seguir así"]) {
  test(`phrase rule does not assert intent from context: ${text}`, () => {
    assert.equal(getCrisisResult(text), null);
  });
}
