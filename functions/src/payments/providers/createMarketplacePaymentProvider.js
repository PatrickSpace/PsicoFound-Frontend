const {FakeMarketplacePaymentProvider} = require("./FakeMarketplacePaymentProvider");
const {MercadoPagoMarketplaceProvider} = require("./MercadoPagoMarketplaceProvider");

function createMarketplacePaymentProvider(config) {
  return config.useFakeProvider ?
    new FakeMarketplacePaymentProvider(config) :
    new MercadoPagoMarketplaceProvider(config);
}

module.exports = {createMarketplacePaymentProvider};
