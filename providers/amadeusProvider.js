const Amadeus = require("amadeus");
const BaseProvider = require("./baseProvider");
const { getOrSet } = require("../services/cacheService");
const { acquireToken } = require("../services/rateLimiter");

class AmadeusProvider extends BaseProvider {
  constructor(config) {
    super();

    this.rateLimit = Number(process.env.AMADEUS_RATE_LIMIT) || 40;
    this.rateWindow = Number(process.env.AMADEUS_RATE_WINDOW) || 10;

    this.amadeus = new Amadeus({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      hostname: config.hostname, // MUST be "test" or "production"
    });

    console.log("Using hostname:", config.hostname);
  }

  async searchFlights(destination, departure, returnDate) {
    const payload = { destination, departure, returnDate };

    return getOrSet("amadeus", payload, async () => {
      // 1️⃣ Distributed rate limit
      const allowed = await acquireToken(
        "amadeus",
        this.rateLimit,
        this.rateWindow,
      );

      if (!allowed) {
        return { success: false, error: "Rate limit exceeded" };
      }

      try {
        const response = await this.amadeus.shopping.flightOffersSearch.get({
          originLocationCode: "BUD",
          destinationLocationCode: destination,
          departureDate: departure,
          returnDate: returnDate,
          adults: 1,
          max: 1,
        });

        const offers =
          response?.data || response?.result?.data || response?.body?.data;

        if (!offers || !Array.isArray(offers) || offers.length === 0) {
          return { success: false };
        }

        const cheapest = offers[0];

        return {
          success: true,
          data: {
            destination,
            departure,
            return: returnDate,
            price: Number(cheapest?.price?.total),
            currency: cheapest?.price?.currency,
          },
        };
      } catch (error) {
        const status = error.response?.statusCode || error.response?.status;

        console.error("Amadeus error:", status);

        return { success: false };
      }
    });
  }
}

module.exports = AmadeusProvider;
