const BaseProvider = require("./baseProvider");
const appConfig = require("../config/appConfig");

function generateMockPrice(
  destination,
  departure,
  returnDate,
  origin = appConfig.departureAirports.default,
) {
  const input = `${origin}-${departure}-${destination}-${returnDate}`;

  let hash = 2166136261;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const normalized = (hash >>> 0) % 60000;

  return 20000 + normalized;
}

async function searchMockFlights(destination, departure, returnDate, origin) {
  // Keep E2E searches deterministic; simulate random failures in development.
  if (process.env.E2E_TEST !== "true" && Math.random() < 0.15) {
    throw new Error("Mock API error");
  }

  const price = generateMockPrice(destination, departure, returnDate, origin);

  return {
    destination,
    departure,
    return: returnDate,
    price,
    currency: "HUF",
    bookingUrl: "https://www.google.com/travel/flights?test",
  };
}

class MockProvider extends BaseProvider {
  async searchFlights(
    destination,
    departure,
    returnDate,
    origin = appConfig.departureAirports.default,
  ) {
    try {
      const result = await searchMockFlights(
        destination,
        departure,
        returnDate,
        origin,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        reason: "provider_error",
        error: error.message,
      };
    }
  }
}

module.exports = MockProvider;
module.exports.generateMockPrice = generateMockPrice;
