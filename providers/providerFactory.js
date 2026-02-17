const MockProvider = require("./mockProvider");
const AmadeusProvider = require("./amadeusProvider");
const { getProviderConfig } = require("../config/providers");

function getProvider() {
  const config = getProviderConfig();

  switch (config.type) {
    case "amadeus":
      return new AmadeusProvider(config);

    case "mock":
    default:
      return new MockProvider();
  }
}

module.exports = { getProvider };
