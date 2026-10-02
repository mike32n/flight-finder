const BaseProvider = require("./baseProvider");

function generateMockPrice(destination, departure, returnDate) {
  const input = `${departure}-${destination}-${returnDate}`;

  let hash = 2166136261;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const normalized = (hash >>> 0) % 60000;

  return 20000 + normalized;
}

async function searchMockFlights(destination, departure, returnDate) {
  // 15% chance of error to simulate API issues
  if (Math.random() < 0.15) {
    throw new Error("Mock API error");
  }

  const price = generateMockPrice(destination, departure, returnDate);

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
  async searchFlights(destination, departure, returnDate) {
    try {
      const result = await searchMockFlights(
        destination,
        departure,
        returnDate,
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
