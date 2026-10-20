const {normalizeKey} = require("./criteria");

function normalizeModality(value) {
  const key = normalizeKey(value);
  if (["online", "remoto", "remota", "virtual"].includes(key)) return "remoto";
  if (["presencial", "precencial"].includes(key)) return "presencial";
  if (["hibrido", "hibrida", "hiibrido"].includes(key)) return "hibrido";
  if (["indiferente", "me da igual", "me es indiferente",
    "sin preferencia"].includes(key)) return "";
  return key;
}

function hasValidModality(value) {
  const key = normalizeKey(value);
  return Boolean(key) &&
    ["remoto", "presencial", "hibrido", ""].includes(normalizeModality(value));
}

function modalityMatches(offered, requested) {
  const required = normalizeModality(requested);
  if (!required) return true;
  const alternatives = (value) => normalizeModality(value) === "hibrido" ?
    ["remoto", "presencial"] : [normalizeModality(value)];
  const values = Array.isArray(offered) ? offered : [offered];
  return values.some((value) => alternatives(value).some((mode) =>
    alternatives(required).includes(mode)));
}

module.exports = {normalizeModality, hasValidModality, modalityMatches};
