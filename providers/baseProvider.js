class BaseProvider {
  async searchFlights(destination, departure, returnDate, origin) {
    throw new Error("searchFlights must be implemented");
  }
}

module.exports = BaseProvider;
