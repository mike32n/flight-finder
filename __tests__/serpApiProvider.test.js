const axios = require("axios");
const SerpApiProvider = require("../providers/serpApiProvider");

jest.mock("axios");

jest.mock("../services/cacheService", () => ({
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

  test("returns failure when no flights found", async () => {
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

    expect(result.success).toBe(false);
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

    expect(result.success).toBe(false);
  });

  test("returns failure on API error", async () => {
    axios.get.mockRejectedValue(new Error("SerpApi unavailable"));

    const result = await provider.searchFlights(
      "BCN",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result.success).toBe(false);
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
