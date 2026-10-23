const AmadeusProvider = require("../../providers/amadeusProvider");

// Prevent real rate limiter / timers
jest.mock("../../services/rateLimiter", () => ({
  acquireToken: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../services/cacheService", () => ({
  getOrSet: jest.fn(async (_, __, fetcher, { normalize } = {}) => {
    const result = await fetcher(new AbortController().signal);

    return normalize ? normalize(result) : result;
  }),
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
      mockAmadeus, // ✅ injected here
    );
  });

  test.each(["data", "result", "body"])(
    "returns normalized flights from response.%s",
    async (location) => {
      const offers = [{ price: { total: "123.45", currency: "EUR" } }];

      const response =
        location === "data"
          ? { data: offers }
          : { [location]: { data: offers } };

      mockAmadeus.shopping.flightOffersSearch.get.mockResolvedValue(response);

      const result = await provider.searchFlights(
        "BCN",
        "2027-03-06",
        "2027-03-08",
      );

      expect(result).toEqual({
        success: true,
        data: {
          destination: "BCN",
          departure: "2027-03-06",
          return: "2027-03-08",
          price: 123.45,
          currency: "EUR",
        },
      });

      expect(mockAmadeus.shopping.flightOffersSearch.get).toHaveBeenCalledTimes(
        1,
      );
    },
  );

  test("returns failure when no offers", async () => {
    mockAmadeus.shopping.flightOffersSearch.get.mockResolvedValue({
      data: [],
    });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result.success).toBe(false);
  });

  test.each([
    [429, "Rate limit"],
    [503, "Service unavailable"],
    [null, "Network unavailable"],
  ])(
    "returns provider_error after one request (%s)",
    async (status, message) => {
      const error = new Error(message);

      if (status !== null) {
        error.response = { statusCode: status };
      }

      mockAmadeus.shopping.flightOffersSearch.get.mockRejectedValue(error);

      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      try {
        const result = await provider.searchFlights(
          "BCN",
          "2027-03-06",
          "2027-03-08",
        );

        expect(result).toEqual({
          success: false,
          reason: "provider_error",
          error: message,
        });

        expect(
          mockAmadeus.shopping.flightOffersSearch.get,
        ).toHaveBeenCalledTimes(1);
      } finally {
        errorSpy.mockRestore();
      }
    },
  );

  test("passes selected origin to Amadeus", async () => {
    mockAmadeus.shopping.flightOffersSearch.get.mockResolvedValue({
      data: [{ price: { total: "100", currency: "EUR" } }],
    });

    await provider.searchFlights("AMS", "2026-10-16", "2026-10-18", "VIE");

    expect(mockAmadeus.shopping.flightOffersSearch.get).toHaveBeenCalledWith(
      expect.objectContaining({ originLocationCode: "VIE" }),
    );
  });

  test("rejects a provider result with an invalid currency", async () => {
    mockAmadeus.shopping.flightOffersSearch.get.mockResolvedValue({
      data: [
        {
          price: {
            total: "123.45",
            currency: "INVALID",
          },
        },
      ],
    });

    const result = await provider.searchFlights(
      "BCN",
      "2027-03-06",
      "2027-03-08",
    );

    expect(result).toEqual({
      success: false,
      reason: "provider_error",
      error: "Invalid provider response",
    });
  });
});
