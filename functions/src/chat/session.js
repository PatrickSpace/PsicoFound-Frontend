const {Timestamp} = require("firebase-admin/firestore");
const {randomUUID} = require("node:crypto");
const {normalizeMessage} = require("../utils/text");

function getActiveChatSession(conversation = {}) {
  const now = Date.now();
  const savedStartedAt = timestampToMillis(conversation.sessionStartedAt);
  const savedSessionId = normalizeMessage(conversation.activeSessionId);
  const hasActiveSession =
    savedSessionId && savedStartedAt;

  const sessionStartedAt = hasActiveSession ? savedStartedAt : now;
  const sessionId = hasActiveSession ? savedSessionId : randomUUID();

  return buildChatSession(sessionId, sessionStartedAt);
}

function createChatSession() {
  const now = Date.now();
  return buildChatSession(randomUUID(), now);
}

function buildChatSession(sessionId, sessionStartedAt) {
  return {
    id: sessionId,
    startedAt: Timestamp.fromMillis(sessionStartedAt),
    expiresAt: null,
  };
}

function timestampToMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return Number(value) || 0;
}

module.exports = {
  createChatSession,
  getActiveChatSession,
};
