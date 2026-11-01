/* eslint-disable max-len */
// Synthetic data only. No provider calls. Emits text for an optional offline tokenizer.
const {execFileSync} = require("node:child_process");
const {runInNewContext} = require("node:vm");
const {memoryFirestore} = require("./memoryFirestore");
const {getRecentHistory} = require("../history");
const {buildProfileChatMessages} = require("../../ai/profilePrompt");
const baselineCommit = "48967838c3762be13e0dbdaa92d8d2ab0fc2fd9c";
function baselineModule(path) {
  const source = execFileSync("git", ["show", `${baselineCommit}:${path}`], {encoding: "utf8"});
  const module = {exports: {}};
  runInNewContext(source, {module, require: () => ({CHAT_HISTORY_FETCH_LIMIT: 60, CHAT_HISTORY_MODEL_LIMIT: 15})});
  return module.exports;
}
async function compare() {
  const scenarios = [];
  for (const count of [0, 2, 4, 15, 30]) {
    const db = memoryFirestore();
    for (let i = 0; i < count; i++) {
      const exchange = {
        user: `Intercambio ${i}. ` + "Quisiera apoyo para manejar el estrés del trabajo y organizar mejor mis actividades. ".repeat(4),
        assistant: "Gracias por compartir lo que estás viviendo. Podemos buscar un profesional que te acompañe. ¿Prefieres atención online, presencial, híbrida o te es indiferente?",
      };
      for (const role of ["user", "assistant"]) db.seed(`messages/${role}_${i}`, {sessionId: "synthetic", requestId: `request-${i}`, role, text: exchange[role], createdAt: new Date(i + 1)});
    }
    const input = {currentProfile: {temas: ["Problemas laborales"], modalidad: "online", preferenciaGenero: "indiferente"}, latestUserMessage: "Prefiero un terapeuta mayor de 45 años.", activeTurn: {question: "¿Tienes alguna preferencia sobre el rango de edad del terapeuta o te es indiferente?"}};
    const beforeHistory = await baselineModule("functions/src/chat/history.js").getRecentHistory(db.collection("messages"), "synthetic");
    const beforeDocuments = db.metrics.historyDocuments;
    const before = baselineModule("functions/src/ai/profilePrompt.js").buildProfileChatMessages({...input, history: beforeHistory});
    const afterHistory = await getRecentHistory(db.collection("messages"), "synthetic");
    const after = buildProfileChatMessages({...input, history: afterHistory});
    scenarios.push({completedExchanges: count, beforeDocuments, afterDocuments: db.metrics.historyDocuments - beforeDocuments,
      beforeHistoryCharacters: beforeHistory.length, afterHistoryCharacters: afterHistory.reduce((n, e) => n + e.user.length + e.assistant.length, 0),
      beforeContent: before.map((m) => m.content), afterContent: after.map((m) => m.content)});
  }
  return {baselineCommit, scenarios};
}
if (require.main === module) compare().then((result) => process.stdout.write(JSON.stringify(result)));
module.exports = {compare};
