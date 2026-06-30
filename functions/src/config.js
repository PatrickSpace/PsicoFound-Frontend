const {defineSecret} = require("firebase-functions/params");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const PRIMARY_AI_PROVIDER = process.env.PRIMARY_AI_PROVIDER || "gemini";
const FALLBACK_AI_PROVIDER = process.env.FALLBACK_AI_PROVIDER || "gemini";
const AI_MODEL = process.env.AI_MODEL || "gemini-2.5-flash";
const FALLBACK_AI_MODEL = process.env.FALLBACK_AI_MODEL || "gemini-2.5-flash";
const GEMINI_MODEL = process.env.GEMINI_MODEL || AI_MODEL;
const GEMINI_HTTP_TIMEOUT_MS = 20000;
const CHAT_SESSION_DURATION_MS = 5 * 60 * 1000;
const CHAT_HISTORY_FETCH_LIMIT = 100;
const CHAT_HISTORY_MODEL_LIMIT = 50;

module.exports = {
  AI_MODEL,
  FALLBACK_AI_MODEL,
  FALLBACK_AI_PROVIDER,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_HTTP_TIMEOUT_MS,
  PRIMARY_AI_PROVIDER,
  CHAT_SESSION_DURATION_MS,
  CHAT_HISTORY_FETCH_LIMIT,
  CHAT_HISTORY_MODEL_LIMIT,
};
