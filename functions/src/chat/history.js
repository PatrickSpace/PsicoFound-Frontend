const {
  CHAT_HISTORY_FETCH_LIMIT,
  CHAT_HISTORY_MODEL_LIMIT,
} = require("../config");

async function getRecentHistory(messagesRef, sessionId) {
  const snapshot = await messagesRef
      .where("sessionId", "==", sessionId)
      .orderBy("createdAt", "desc")
      .limit(Math.min(CHAT_HISTORY_FETCH_LIMIT, CHAT_HISTORY_MODEL_LIMIT))
      .get();

  return snapshot.docs
      .map((doc) => doc.data())
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
