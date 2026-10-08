const axios = require("axios");

const BaseProvider = require("./baseProvider");
const { getOrSet } = require("../services/cacheService");
const { acquireToken } = require("../services/rateLimiter");

class SerpApiProvider extends BaseProvider {
  constructor(config) {
    super();

    this.apiKey = config.apiKey;
    this.rateLimit = config.rateLimit ?? 100;
    this.rateLimitWindowSeconds = config.rateLimitWindowSeconds ?? 60;
  }

  async searchFlights(destination, departure, returnDate) {
    const payload = {
      destination,
      departure,
      returnDate,
    };

    return getOrSet("serpapi", payload, async () => {
      try {
        const allowed = await acquireToken(
          "serpapi",
          this.rateLimit,
          this.rateLimitWindowSeconds,
        );

        if (!allowed) {
          return {
            success: false,
            reason: "provider_error",
            error: "SerpApi rate limit exceeded",
          };
        }

        const response = await axios.get("https://serpapi.com/search.json", {
          params: {
            engine: "google_flights",

            departure_id: "BUD",
            arrival_id: destination,

            outbound_date: departure,
            return_date: returnDate,

            currency: "HUF",
            hl: "en",

            api_key: this.apiKey,
          },
        });

        const flights = [
          ...(response.data?.best_flights || []),
          ...(response.data?.other_flights || []),
        ];

        if (!flights.length) {
          return {
            success: false,
            reason: "no_results",
          };
        }

        const pricedFlights = flights.filter(
          (flight) => Number.isFinite(flight?.price) && flight.price > 0,
        );

        if (!pricedFlights.length) {
          throw new Error("No valid flight prices in provider response");
        }

        const cheapest = pricedFlights.reduce((min, current) =>
          current.price < min.price ? current : min,
        );

        return {
          success: true,
          data: {
            destination,
            departure,
            return: returnDate,
            price: Number(cheapest.price),
            currency: "HUF",
            bookingUrl: response.data?.search_metadata?.google_flights_url,
          },
        };
      } catch (error) {
        console.error("SerpApi error:", error.response?.data || error.message);

        return {
          success: false,
          reason: "provider_error",
          error: error.message,
        };
      }
    });
  }
}

module.exports = SerpApiProvider;
