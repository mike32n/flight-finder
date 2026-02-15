const Amadeus = require("amadeus");
const BaseProvider = require("./baseProvider");

class AmadeusProvider extends BaseProvider {
  constructor() {
    super();
    this.amadeus = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET,
    });
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
        console.log("Rate limit hit. Retrying in 2 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        return this.searchFlights(destination, departure, returnDate);
      }

      console.error("Amadeus error:", status);
      return { success: false };
    }
  }
}

module.exports = AmadeusProvider;
