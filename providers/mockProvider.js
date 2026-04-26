const BaseProvider = require("./baseProvider");
const { searchMockFlights } = require("../flightService");

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
        error: error.message,
      };
    }
  }
}

module.exports = MockProvider;
