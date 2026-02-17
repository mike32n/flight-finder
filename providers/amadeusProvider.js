const Amadeus = require("amadeus");
const BaseProvider = require("./baseProvider");

class AmadeusProvider extends BaseProvider {
  constructor(config) {
    super();

    this.retryDelay = config.retryDelay || 1000;

    this.amadeus = new Amadeus({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      hostname: config.hostname,
    });
    console.log("Using hostname:", config.hostname);
    console.log("Amadeus client:", this.amadeus.client);
  }

  async searchFlights(destination, departure, returnDate) {
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

      if (status === 429) {
        console.log(`Rate limit hit. Retrying in ${this.retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));

        return this.searchFlights(destination, departure, returnDate);
      }

      console.error("Amadeus error:", status);
      console.error("FULL ERROR:", error);
      console.error("RESPONSE:", error.response);
      console.error("BODY:", error.response?.body);
      console.error("RESULT:", error.response?.result);
      return { success: false };
    }
  }
}

module.exports = AmadeusProvider;
