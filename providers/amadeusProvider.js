const Amadeus = require("amadeus");
const BaseProvider = require("./baseProvider");
const appConfig = require("../config/appConfig");
const { getOrSet } = require("../services/cacheService");
const { acquireToken } = require("../services/rateLimiter");
const { normalizeProviderResult } = require("../utils/providerResultValidator");

class AmadeusProvider extends BaseProvider {
  constructor(config, amadeusClient = null) {
    super();

    this.rateLimit = Number(process.env.AMADEUS_RATE_LIMIT) || 40;
    this.rateWindow = Number(process.env.AMADEUS_RATE_WINDOW) || 10;

    this.amadeus =
      amadeusClient ||
      new Amadeus({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        hostname: config.hostname,
      });

    console.log("Using hostname:", config.hostname);
  }

  async searchFlights(
    destination,
    departure,
    returnDate,
    origin = appConfig.departureAirports.default,
  ) {
    const payload = { origin, destination, departure, returnDate };

    return getOrSet(
      "amadeus",
      payload,
      async (signal) => {
        try {
          signal.throwIfAborted();

          const allowed = await acquireToken(
            "amadeus",
            this.rateLimit,
            this.rateWindow,
          );

          signal.throwIfAborted();

          if (!allowed) {
            return {
              success: false,
              reason: "provider_error",
              error: "Rate limit exceeded",
            };
          }

          const response = await this.amadeus.shopping.flightOffersSearch.get({
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate: departure,
            returnDate: returnDate,
            adults: 1,
            max: 1,
          });

          const offers =
            response?.data || response?.result?.data || response?.body?.data;

          if (!Array.isArray(offers) || offers.length === 0) {
            return {
              success: false,
              reason: "no_results",
            };
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
          const fullError =
            error.response?.result ||
            error.response?.data ||
            error.response?.body ||
            error;

          console.error(
            "FULL Amadeus error:",
            JSON.stringify(fullError, null, 2),
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

module.exports = AmadeusProvider;
