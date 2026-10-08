const axios = require("axios");
const SerpApiProvider = require("../../providers/serpApiProvider");

jest.mock("axios");

jest.mock("../../services/cacheService", () => ({
  getOrSet: jest.fn((_, __, fetcher) => fetcher()),
}));

describe("SerpApiProvider", () => {
  let provider;

  beforeEach(() => {
    jest.clearAllMocks();

    provider = new SerpApiProvider({
      apiKey: "test-api-key",
    });
  });

  test("returns success when API returns flights", async () => {
    axios.get.mockResolvedValue({
      data: {
        best_flights: [{ price: 80000 }, { price: 65000 }, { price: 72000 }],
      },
    });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result.success).toBe(true);
    expect(result.data.price).toBe(65000);
    expect(result.data.currency).toBe("HUF");
  });

  test("returns cheapest price from other_flights", async () => {
    axios.get.mockResolvedValue({
      data: {
        other_flights: [{ price: 91000 }, { price: 73000 }],
      },
    });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result.success).toBe(true);
    expect(result.data.price).toBe(73000);
  });

  test("returns cheapest price across best_flights and other_flights", async () => {
    axios.get.mockResolvedValue({
      data: {
        best_flights: [{ price: 42000 }, { price: 34000 }],
        other_flights: [{ price: 29000 }, { price: 55000 }],
      },
    });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result.success).toBe(true);
    expect(result.data.price).toBe(29000);
  });

  test("returns no_results when no flights found", async () => {
    axios.get.mockResolvedValue({
      data: {
        best_flights: [],
        other_flights: [],
      },
    });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result).toEqual({
      success: false,
      reason: "no_results",
    });
  });

  test("returns failure when response is empty", async () => {
    axios.get.mockResolvedValue({
      data: {},
    });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result).toEqual({
      success: false,
      reason: "no_results",
    });
  });

  test("returns provider_error on API error", async () => {
    axios.get.mockRejectedValue(new Error("SerpApi unavailable"));

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result).toEqual({
      success: false,
      reason: "provider_error",
      error: "SerpApi unavailable",
    });
  });

  test("ignores flights without valid prices when selecting the cheapest", async () => {
    axios.get.mockResolvedValue({
      data: {
        best_flights: [
          {},
          { price: null },
          { price: 0 },
          { price: -100 },
          { price: 30000 },
        ],
        other_flights: [{ price: 25000 }],
      },
    });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result.success).toBe(true);
    expect(result.data.price).toBe(25000);
  });

  test("returns provider_error when flights have no valid prices", async () => {
    axios.get.mockResolvedValue({
      data: {
        best_flights: [{}, { price: null }, { price: 0 }, { price: -100 }],
      },
    });

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result).toEqual({
      success: false,
      reason: "provider_error",
      error: "No valid flight prices in provider response",
    });
  });

  test("calls SerpApi with correct parameters", async () => {
    axios.get.mockResolvedValue({
      data: {
        best_flights: [{ price: 50000 }],
      },
    });

    await provider.searchFlights("PMI", "2026-08-01", "2026-08-08");

    expect(axios.get).toHaveBeenCalledWith(
      "https://serpapi.com/search.json",
      expect.objectContaining({
        params: expect.objectContaining({
          engine: "google_flights",
          departure_id: "BUD",
          arrival_id: "PMI",
          outbound_date: "2026-08-01",
          return_date: "2026-08-08",
          api_key: "test-api-key",
        }),
      }),
    );
  });
});
