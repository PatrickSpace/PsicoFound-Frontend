const admin = require("firebase-admin");
const {CHAT_SESSION_DURATION_MS} = require("../config");
const {normalizeMessage} = require("../utils/text");

function getActiveChatSession(conversation = {}) {
  const now = Date.now();
  const savedStartedAt = timestampToMillis(conversation.sessionStartedAt);
  const savedSessionId = normalizeMessage(conversation.activeSessionId);
  const hasActiveSession =
    savedSessionId && savedStartedAt &&
    now - savedStartedAt < CHAT_SESSION_DURATION_MS;

  const sessionStartedAt = hasActiveSession ? savedStartedAt : now;
  const sessionId = hasActiveSession ? savedSessionId : `profile-chat-${now}`;

  return buildChatSession(sessionId, sessionStartedAt);
}

function createChatSession() {
  const now = Date.now();
  return buildChatSession(`profile-chat-${now}`, now);
}

function buildChatSession(sessionId, sessionStartedAt) {
  return {
    id: sessionId,
    startedAt: admin.firestore.Timestamp.fromMillis(sessionStartedAt),
    expiresAt: admin.firestore.Timestamp.fromMillis(
        sessionStartedAt + CHAT_SESSION_DURATION_MS,
    ),
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
