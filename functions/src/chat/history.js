const {
  CHAT_HISTORY_FETCH_LIMIT,
  CHAT_HISTORY_MODEL_LIMIT,
} = require("../config");

async function getRecentHistory(messagesRef, sessionId) {
  const snapshot = await messagesRef
      .orderBy("createdAt", "desc")
      .limit(CHAT_HISTORY_FETCH_LIMIT)
      .get();

  return snapshot.docs
      .map((doc) => doc.data())
      .filter((item) => item.sessionId === sessionId)
      .slice(0, CHAT_HISTORY_MODEL_LIMIT)
      .reverse()
      .map((item) => {
        const speaker = item.role === "assistant" ? "Asistente" : "Usuario";
        return `${speaker}: ${(item.text || "").toString().trim()}`;
      })
      .filter((line) => line.length > 10)
      .join("\n");
}

module.exports = {
  getRecentHistory,
};
