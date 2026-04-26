class BaseProvider {
  async searchFlights(destination, departure, returnDate) {
    throw new Error("searchFlights must be implemented");
  }

  normalize(result) {
    if (!result || typeof result !== "object") {
      return { success: false };
    }
    return result;
  }
}

module.exports = BaseProvider;
