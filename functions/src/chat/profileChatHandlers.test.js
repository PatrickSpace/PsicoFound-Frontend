const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {join} = require("node:path");
const {test} = require("node:test");

test("profileChatHandlers consume AIService y no un proveedor concreto", () => {
  const source = readFileSync(
      join(__dirname, "profileChatHandlers.js"),
      "utf8",
  );

  assert.match(source, /require\("\.\.\/ai\/AIService"\)/);
  assert.doesNotMatch(source, /geminiClient/);
  assert.doesNotMatch(source, /GoogleGenAI/);
  assert.doesNotMatch(source, /generateContent/);
  assert.doesNotMatch(source, /askGemini/);
});
