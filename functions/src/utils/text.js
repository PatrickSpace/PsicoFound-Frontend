function normalizeMessage(value) {
  return (value || "").toString().trim();
}

function normalizeReply(value) {
  const fallback = "Gracias por contarme. Sigamos paso a paso.";
  return (value || fallback).toString().trim() || fallback;
}

function normalizeForMatching(value) {
  return (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
}

module.exports = {
  normalizeMessage,
  normalizeReply,
  normalizeForMatching,
};
