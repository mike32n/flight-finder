const MockProvider = require("./mockProvider");
const AmadeusProvider = require("./amadeusProvider");
const SerpApiProvider = require("./serpApiProvider");

const config = require("../config/providers");

let provider;

function getProvider() {
  if (provider) {
    return provider;
  }

  switch (config.type) {
    case "amadeus":
      provider = new AmadeusProvider(config);
      break;

    case "serpapi":
      provider = new SerpApiProvider(config);
      break;

    case "mock":
    default:
      provider = new MockProvider();
      break;
  }

  return provider;
}

module.exports = { getProvider };
