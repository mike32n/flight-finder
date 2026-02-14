class BaseProvider {
  async searchFlights(destination, departure, returnDate) {
    throw new Error("searchFlights must be implemented");
  }
}

module.exports = BaseProvider;
