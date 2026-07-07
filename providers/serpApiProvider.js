const axios = require("axios");

const BaseProvider = require("./baseProvider");
const { getOrSet } = require("../services/cacheService");

class SerpApiProvider extends BaseProvider {
  constructor(config) {
    super();

    this.apiKey = config.apiKey;
  }

  async searchFlights(destination, departure, returnDate) {
    const payload = {
      destination,
      departure,
      returnDate,
    };

    return getOrSet("serpapi", payload, async () => {
      try {
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

        const flights =
          response.data?.best_flights || response.data?.other_flights || [];

        if (!flights.length) {
          return { success: false };
        }

        const cheapest = flights.reduce((min, current) =>
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
          },
        };
      } catch (error) {
        console.error("SerpApi error:", error.response?.data || error.message);

        return {
          success: false,
          error: error.message,
        };
      }
    });
  }
}

module.exports = SerpApiProvider;
