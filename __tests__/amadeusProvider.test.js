const AmadeusProvider = require("../providers/amadeusProvider");

// Prevent real rate limiter / timers
jest.mock("../services/rateLimiter", () => ({
  acquireToken: jest.fn().mockResolvedValue(true),
}));

jest.mock("../services/cacheService", () => ({
  getOrSet: jest.fn((_, __, fetcher) => fetcher()), 
}));

describe("AmadeusProvider", () => {
  let provider;
  let mockAmadeus;

  beforeEach(() => {
    mockAmadeus = {
      shopping: {
        flightOffersSearch: {
          get: jest.fn(),
        },
      },
    };

    provider = new AmadeusProvider(
      {
        clientId: "test",
        clientSecret: "test",
        hostname: "test",
      },
      mockAmadeus // ✅ injected here
    );
  });

  test("returns success when API returns data", async () => {
    mockAmadeus.shopping.flightOffersSearch.get.mockResolvedValue({
      data: [
        {
          price: { total: "123.45", currency: "EUR" },
        },
      ],
    });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04"
    );

    expect(result.success).toBe(true);
    expect(result.data.price).toBe(123.45);
    expect(result.data.currency).toBe("EUR");
  });

  test("returns failure when no offers", async () => {
    mockAmadeus.shopping.flightOffersSearch.get.mockResolvedValue({
      data: [],
    });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04"
    );

    expect(result.success).toBe(false);
  });

  test("retries on 429", async () => {
    let callCount = 0;

    mockAmadeus.shopping.flightOffersSearch.get.mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        const error = new Error("Rate limit");
        error.response = { statusCode: 429 };
        return Promise.reject(error);
      }

      return Promise.resolve({
        data: [{ price: { total: "100", currency: "EUR" } }],
      });
    });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04"
    );

    expect(callCount).toBe(1);
    expect(result.success).toBe(false);
  });

  test("returns failure on unexpected error", async () => {
    mockAmadeus.shopping.flightOffersSearch.get.mockRejectedValue(
      new Error("API down")
    );

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04"
    );

    expect(result.success).toBe(false);
  });
});