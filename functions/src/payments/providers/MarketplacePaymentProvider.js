class MarketplacePaymentProvider {
  async createSellerAuthorizationUrl() {
    throw new Error("Not implemented");
  }

  async exchangeAuthorizationCode() {
    throw new Error("Not implemented");
  }

  async disconnectSeller() {
    throw new Error("Not implemented");
  }

  async createPayment() {
    throw new Error("Not implemented");
  }

  async getPayment() {
    throw new Error("Not implemented");
  }

  async refundPayment() {
    throw new Error("Not implemented");
  }

  async processWebhookEvent() {
    throw new Error("Not implemented");
  }
}

module.exports = {MarketplacePaymentProvider};
