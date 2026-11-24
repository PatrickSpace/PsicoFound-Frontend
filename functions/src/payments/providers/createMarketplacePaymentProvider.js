const {FakeMarketplacePaymentProvider} = require("./FakeMarketplacePaymentProvider");
const {MercadoPagoMarketplaceProvider} = require("./MercadoPagoMarketplaceProvider");
const {CulqiPaymentProvider} = require("./CulqiPaymentProvider");

function createMarketplacePaymentProvider(config) {
  if (config.useFakeProvider) return new FakeMarketplacePaymentProvider(config);
  if (config.provider === "culqi") return new CulqiPaymentProvider(config);
  return new MercadoPagoMarketplaceProvider(config);
}

module.exports = {createMarketplacePaymentProvider};
