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
        adults: "1",
        max: "3",
      });

      if (!response.data.length) {
        return { success: false };
      }

      const cheapest = response.data[0];

      return {
        success: true,
        data: {
          destination,
          departure,
          return: returnDate,
          price: parseFloat(cheapest.price.total),
        },
      };
    } catch (error) {
      return { success: false };
    }
  }
}

module.exports = AmadeusProvider;
