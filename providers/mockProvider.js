const BaseProvider = require("./baseProvider");
const { searchMockFlights } = require("../flightService");

class MockProvider extends BaseProvider {
  async searchFlights(destination, departure, returnDate) {
    return searchMockFlights(destination, departure, returnDate);
  }
}

module.exports = MockProvider;
