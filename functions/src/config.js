const {defineSecret} = require("firebase-functions/params");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const PRIMARY_AI_PROVIDER = process.env.PRIMARY_AI_PROVIDER || "openai";
const FALLBACK_AI_PROVIDER = process.env.FALLBACK_AI_PROVIDER || "";
const AI_MODEL = process.env.AI_MODEL || "gpt-6-luna";
const FALLBACK_AI_MODEL = process.env.FALLBACK_AI_MODEL || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_HTTP_TIMEOUT_MS = 20000;
const CHAT_HISTORY_FETCH_LIMIT = 60;
const CHAT_HISTORY_MODEL_LIMIT = 15;

module.exports = {
  AI_MODEL,
  FALLBACK_AI_MODEL,
  FALLBACK_AI_PROVIDER,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_HTTP_TIMEOUT_MS,
  PRIMARY_AI_PROVIDER,
  OPENAI_API_KEY,
  CHAT_HISTORY_FETCH_LIMIT,
  CHAT_HISTORY_MODEL_LIMIT,
};
