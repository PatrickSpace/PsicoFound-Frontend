const {defineSecret} = require("firebase-functions/params");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_HTTP_TIMEOUT_MS = 20000;
const CHAT_SESSION_DURATION_MS = 5 * 60 * 1000;
const CHAT_HISTORY_FETCH_LIMIT = 100;
const CHAT_HISTORY_MODEL_LIMIT = 50;

module.exports = {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_HTTP_TIMEOUT_MS,
  CHAT_SESSION_DURATION_MS,
  CHAT_HISTORY_FETCH_LIMIT,
  CHAT_HISTORY_MODEL_LIMIT,
};
