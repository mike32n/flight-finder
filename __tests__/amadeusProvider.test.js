jest.mock("amadeus");

const AmadeusProvider = require("../providers/amadeusProvider");

describe("AmadeusProvider", () => {
  let provider;

  beforeEach(() => {
    provider = new AmadeusProvider({
      clientId: "test",
      clientSecret: "test",
      hostname: "test",
      retryDelay: 10,
    });
  });

  test("returns success when API returns data", async () => {
    provider.amadeus.shopping.flightOffersSearch.get = jest
      .fn()
      .mockResolvedValue({
        data: [
          {
            price: { total: "123.45", currency: "EUR" },
          },
        ],
      });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result.success).toBe(true);
    expect(result.data.price).toBe(123.45);
  });

  test("returns failure when no offers", async () => {
    provider.amadeus.shopping.flightOffersSearch.get = jest
      .fn()
      .mockResolvedValue({
        data: [],
      });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result.success).toBe(false);
  });

  test("retries on 429", async () => {
    let callCount = 0;

    provider.amadeus.shopping.flightOffersSearch.get = jest
      .fn()
      .mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          const error = new Error("Rate limit");
          error.response = { statusCode: 429 };
          throw error;
        }

        return Promise.resolve({
          data: [{ price: { total: "100", currency: "EUR" } }],
        });
      });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(callCount).toBe(2);
    expect(result.success).toBe(true);
  });

  test("returns failure on unexpected error", async () => {
    provider.amadeus.shopping.flightOffersSearch.get = jest
      .fn()
      .mockRejectedValue(new Error("API down"));

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result.success).toBe(false);
  });
});
