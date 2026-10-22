const assert = require("node:assert/strict");
const {test} = require("node:test");
const {getRecentHistory} = require("./history");

test("context keeps the last fifteen complete exchanges only", async () => {
  const docs = [];
  for (let index = 19; index >= 0; index--) {
    docs.push({data: () => ({sessionId: "active", requestId: `r-${index}`,
      role: "assistant", text: `A${index}`})});
    docs.push({data: () => ({sessionId: "active", requestId: `r-${index}`,
      role: "user", text: `U${index}`})});
  }
  docs.unshift({data: () => ({sessionId: "active", requestId: "incomplete",
    role: "user", text: "No debe entrar"})});
  const messagesRef = {
    orderBy() {
      return this;
    },
    where() {
      return this;
    },
    limit() {
      return this;
    },
    async get() {
      return {docs};
    },
  };

  const history = await getRecentHistory(messagesRef, "active");
  assert.equal(history.split("\n").length, 30);
  assert.equal(history.includes("Usuario: U4"), false);
  assert.equal(history.includes("Usuario: U5"), true);
  assert.equal(history.includes("Asistente: A19"), true);
  assert.equal(history.includes("No debe entrar"), false);
});
