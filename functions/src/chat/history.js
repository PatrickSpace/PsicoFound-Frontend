const {
  CHAT_HISTORY_FETCH_LIMIT,
  CHAT_HISTORY_MODEL_LIMIT,
} = require("../config");

async function getRecentHistory(messagesRef, sessionId) {
  const snapshot = await messagesRef
      .orderBy("createdAt", "desc")
      .where("sessionId", "==", sessionId)
      .limit(CHAT_HISTORY_FETCH_LIMIT)
      .get();

  const messages = snapshot.docs
      .map((doc) => doc.data())
      .filter((item) => item.sessionId === sessionId)
      .reverse();
  const exchanges = new Map();
  messages.forEach((item) => {
    if (!item.requestId || !["user", "assistant"].includes(item.role)) return;
    const exchange = exchanges.get(item.requestId) || {};
    exchange[item.role] = (item.text || "").toString().trim();
    exchanges.set(item.requestId, exchange);
  });

  return [...exchanges.values()]
      .filter((exchange) => exchange.user && exchange.assistant)
      .slice(-CHAT_HISTORY_MODEL_LIMIT)
      .flatMap((exchange) => [
        `Usuario: ${exchange.user}`,
        `Asistente: ${exchange.assistant}`,
      ])
      .join("\n");
}

module.exports = {
  getRecentHistory,
};
