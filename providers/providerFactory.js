const MockProvider = require("./mockProvider");
const AmadeusProvider = require("./amadeusProvider");

function getProvider() {
  const provider = process.env.FLIGHT_PROVIDER;
  console.log("Active provider:", provider);

  switch (provider) {
    case "amadeus":
      return new AmadeusProvider();
    case "mock":
    default:
      return new MockProvider();
  }
}

module.exports = { getProvider };
