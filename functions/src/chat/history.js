const {HISTORY_DOCUMENT_LIMIT, selectHistory} = require("../ai/profileContext");

async function getRecentHistory(messagesRef, sessionId) {
  if (!sessionId) return [];
  const snapshot = await messagesRef
      .orderBy("createdAt", "desc")
      .where("sessionId", "==", sessionId)
      .limit(HISTORY_DOCUMENT_LIMIT)
      .get();
  const exchanges = new Map();
  snapshot.docs.map((doc) => doc.data()).reverse().forEach((item) => {
    if (item.sessionId !== sessionId || item.modelContext === false ||
        !item.requestId || !["user", "assistant"].includes(item.role)) return;
    const exchange = exchanges.get(item.requestId) || {};
    exchange[item.role] = (item.text || "").toString().trim();
    exchanges.set(item.requestId, exchange);
  });
  return selectHistory([...exchanges.values()]);
}
module.exports = {getRecentHistory};
