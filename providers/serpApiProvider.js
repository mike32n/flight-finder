const axios = require("axios");

const BaseProvider = require("./baseProvider");
const appConfig = require("../config/appConfig");
const { getOrSet } = require("../services/cacheService");
const { acquireToken } = require("../services/rateLimiter");
const { normalizeProviderResult } = require("../utils/providerResultValidator");

class SerpApiProvider extends BaseProvider {
  constructor(config) {
    super();

    this.apiKey = config.apiKey;
    this.rateLimit = config.rateLimit ?? 100;
    this.rateLimitWindowSeconds = config.rateLimitWindowSeconds ?? 60;
  }

  async searchFlights(
    destination,
    departure,
    returnDate,
    origin = appConfig.departureAirports.default,
  ) {
    const payload = {
      origin,
      destination,
      departure,
      returnDate,
    };

    return getOrSet(
      "serpapi",
      payload,
      async (signal) => {
        try {
          signal.throwIfAborted();

          const allowed = await acquireToken(
            "serpapi",
            this.rateLimit,
            this.rateLimitWindowSeconds,
          );

          signal.throwIfAborted();

          if (!allowed) {
            return {
              success: false,
              reason: "provider_error",
              error: "SerpApi rate limit exceeded",
            };
          }

          const response = await axios.get("https://serpapi.com/search.json", {
            signal,
            timeout: appConfig.api.timeoutMs || 10000,
            params: {
              engine: "google_flights",

              departure_id: origin,
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
          console.error(
            "SerpApi error:",
            error.response?.data || error.message,
          );

          return {
            success: false,
            reason: "provider_error",
            error: error.message,
          };
        }
      },
      { normalize: normalizeProviderResult },
    );
  }
}

module.exports = SerpApiProvider;
