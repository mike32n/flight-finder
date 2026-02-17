const providerConfigs = {
  mock: {
    type: "mock",
    concurrency: 5,
  },

  "amadeus-test": {
    type: "amadeus",
    hostname: "test",
    clientId: process.env.AMADEUS_TEST_CLIENT_ID,
    clientSecret: process.env.AMADEUS_TEST_CLIENT_SECRET,
    concurrency: 1,
    retryDelay: 2000,
  },

  "amadeus-prod": {
    type: "amadeus",
    hostname: "production",
    clientId: process.env.AMADEUS_PROD_CLIENT_ID,
    clientSecret: process.env.AMADEUS_PROD_CLIENT_SECRET,
    concurrency: 5,
    retryDelay: 500,
  },
};

function getProviderConfig() {
  const providerKey = process.env.FLIGHT_PROVIDER || "mock";

  const config = providerConfigs[providerKey];

  if (!config) {
    throw new Error(`Unknown provider: ${providerKey}`);
  }

  console.log("Active provider:", providerKey);
  return config;
}

module.exports = { getProviderConfig };
