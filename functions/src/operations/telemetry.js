const {AsyncLocalStorage} = require("node:async_hooks");
const requestScope = new AsyncLocalStorage();
function correlation() {
  return requestScope.getStore()?.correlationId;
}
module.exports = {requestScope, correlation};
