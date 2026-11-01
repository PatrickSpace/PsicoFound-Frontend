/* eslint-disable max-len */
const HISTORY_EXCHANGE_LIMIT = 4;
const HISTORY_DOCUMENT_LIMIT = HISTORY_EXCHANGE_LIMIT * 2;
const HISTORY_CHARACTER_LIMIT = 12000; // Data minimization guard, NOT tokens.
function redactContact(value) {
  return String(value || "")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[correo omitido]")
      .replace(/\b(?:\+?\d[\s()-]*){9,}\b/g, "[número omitido]");
}
function minimizeText(value, max = 1200) {
  return redactContact(value).slice(0, max);
}
function selectHistory(exchanges) {
  const selected = [];
  let characters = 0;
  for (const exchange of (Array.isArray(exchanges) ? exchanges : []).slice(-HISTORY_EXCHANGE_LIMIT).reverse()) {
    const user = redactContact(exchange.user).trim();
    const assistant = redactContact(exchange.assistant).trim();
    if (!user || !assistant) continue;
    const size = user.length + assistant.length;
    if (characters + size > HISTORY_CHARACTER_LIMIT) break;
    selected.unshift({user, assistant});
    characters += size;
  }
  return selected;
}
module.exports = {HISTORY_EXCHANGE_LIMIT, HISTORY_DOCUMENT_LIMIT, HISTORY_CHARACTER_LIMIT, minimizeText, selectHistory};
