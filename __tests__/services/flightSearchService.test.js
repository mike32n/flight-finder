jest.mock("../../providers/providerFactory", () => ({
  getProvider: jest.fn(),
}));

jest.mock("../../utils/dateGenerator", () => jest.fn());

jest.mock("../../utils/promisePool", () => jest.fn());

jest.mock("../../services/flexDateGenerator", () => ({
  expandControlledFlexibility: jest.fn(),
}));

jest.mock("../../services/smartFlexService", () => ({
  shouldRunFallbackFlex: jest.fn(),
  analyzeFlexResult: jest.fn(),
}));

const { getProvider } = require("../../providers/providerFactory");
const generateTrips = require("../../utils/dateGenerator");
const runWithConcurrencyLimit = require("../../utils/promisePool");
const {
  expandControlledFlexibility,
} = require("../../services/flexDateGenerator");
const appConfig = require("../../config/appConfig");

const searchFlightsMock = jest.fn();

getProvider.mockReturnValue({
  searchFlights: searchFlightsMock,
});

const {
  searchFlights,
  searchFlightsStream,
} = require("../../services/flightSearchService");

const {
  shouldRunFallbackFlex,
  analyzeFlexResult,
} = require("../../services/smartFlexService");

describe("flightSearchService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    shouldRunFallbackFlex.mockReturnValue(false);
    analyzeFlexResult.mockReturnValue(null);

    appConfig.smartFlex.enabled = true;

    generateTrips.mockReturnValue([
      {
        departure: "2026-10-09",
        return: "2026-10-11",
      },
    ]);

    expandControlledFlexibility.mockReturnValue([
      {
        departure: "2026-10-09",
        return: "2026-10-11",
      },
      {
        departure: "2026-10-08",
        return: "2026-10-11",
      },
      {
        departure: "2026-10-09",
        return: "2026-10-12",
      },
    ]);
  });

  test("runs base and flex searches when Smart Flex is enabled", async () => {
    runWithConcurrencyLimit
      .mockResolvedValueOnce([
        {
          success: true,
          data: {
            destination: "CFU",
            departure: "2026-10-09",
            return: "2026-10-11",
            price: 34316,
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          success: true,
          data: {
            destination: "CFU",
            departure: "2026-10-09",
            return: "2026-10-12",
            price: 22966,
          },
        },
      ]);

    await searchFlights({
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
    });

    expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(2);

    expect(expandControlledFlexibility).toHaveBeenCalledWith({
      departure: "2026-10-09",
      return: "2026-10-11",
    });
  });

  test("runs only base search when Smart Flex is disabled", async () => {
    appConfig.smartFlex.enabled = false;

    runWithConcurrencyLimit.mockResolvedValueOnce([
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-11",
          price: 34316,
        },
      },
    ]);

    await searchFlights({
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
    });

    expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(1);
    expect(expandControlledFlexibility).not.toHaveBeenCalled();
  });

  test("runs fallback flex search when Smart Flex is disabled and base search has no results", async () => {
    appConfig.smartFlex.enabled = false;

    shouldRunFallbackFlex.mockReturnValue(true);

    runWithConcurrencyLimit
      .mockResolvedValueOnce([
        {
          success: false,
          reason: "no_results",
        },
      ])
      .mockResolvedValueOnce([
        {
          success: true,
          data: {
            destination: "CFU",
            departure: "2026-10-09",
            return: "2026-10-12",
            price: 22966,
            currency: "HUF",
            bookingUrl: "https://example.com/flex-flight",
          },
        },
      ]);

    const result = await searchFlights({
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
    });

    expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(2);

    expect(result.results).toEqual([
      expect.objectContaining({
        destination: { code: "CFU" },
        departure: "2026-10-09",
        return: "2026-10-12",
        price: 22966,
        currency: "HUF",
        bookingUrl: "https://example.com/flex-flight",
      }),
    ]);
  });

  test("does not run fallback flex search when Smart Flex is disabled and base search fails with provider error", async () => {
    appConfig.smartFlex.enabled = false;

    runWithConcurrencyLimit.mockResolvedValueOnce([
      {
        success: false,
        reason: "provider_error",
        error: "SerpApi unavailable",
      },
    ]);

    const result = await searchFlights({
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
    });

    expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(1);
    expect(expandControlledFlexibility).not.toHaveBeenCalled();

    expect(result.results).toEqual([]);
    expect(result.failedRequests).toBe(1);
  });

  test("does not run fallback flex search when base results contain both no results and provider errors", async () => {
    appConfig.smartFlex.enabled = false;

    runWithConcurrencyLimit.mockResolvedValueOnce([
      {
        success: false,
        reason: "no_results",
      },
      {
        success: false,
        reason: "provider_error",
        error: "SerpApi unavailable",
      },
    ]);

    await searchFlights({
      destinations: ["CFU", "LCA"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
    });

    expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(1);
    expect(expandControlledFlexibility).not.toHaveBeenCalled();
  });

  test("returns cheaper flex result before the base result", async () => {
    runWithConcurrencyLimit
      .mockResolvedValueOnce([
        {
          success: true,
          data: {
            destination: "CFU",
            departure: "2026-10-09",
            return: "2026-10-11",
            price: 34316,
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          success: true,
          data: {
            destination: "CFU",
            departure: "2026-10-08",
            return: "2026-10-11",
            price: 40000,
          },
        },
        {
          success: true,
          data: {
            destination: "CFU",
            departure: "2026-10-09",
            return: "2026-10-12",
            price: 22966,
          },
        },
      ]);

    const result = await searchFlights({
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
    });

    expect(result.results).toHaveLength(3);

    expect(result.results[0]).toEqual(
      expect.objectContaining({
        destination: { code: "CFU" },
        departure: "2026-10-09",
        return: "2026-10-12",
        price: 22966,
        resultType: "flex",
      }),
    );

    expect(result.results[1]).toEqual(
      expect.objectContaining({
        price: 34316,
        resultType: "base",
      }),
    );

    expect(result.results[1].price).toBe(34316);
    expect(result.results[2].price).toBe(40000);
  });

  test("streams fallback flex results when Smart Flex is disabled and base search has no results", async () => {
    appConfig.smartFlex.enabled = false;
    shouldRunFallbackFlex.mockReturnValue(true);

    const onResult = jest.fn();

    runWithConcurrencyLimit
      .mockImplementationOnce(async (_, __, callback) => {
        const baseResults = [
          {
            success: false,
            reason: "no_results",
          },
        ];

        baseResults.forEach(callback);

        return baseResults;
      })
      .mockImplementationOnce(async (_, __, callback) => {
        const flexResults = [
          {
            success: true,
            data: {
              destination: "CFU",
              departure: "2026-10-09",
              return: "2026-10-12",
              price: 22966,
              currency: "HUF",
              bookingUrl: "https://example.com/flex-flight",
            },
          },
        ];

        flexResults.forEach(callback);

        return flexResults;
      });

    await searchFlightsStream({
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
      onResult,
    });

    expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(2);

    expect(shouldRunFallbackFlex).toHaveBeenCalledWith([
      {
        success: false,
        reason: "no_results",
      },
    ]);

    expect(expandControlledFlexibility).toHaveBeenCalled();

    expect(onResult).toHaveBeenCalledWith({
      type: "data",
      data: expect.objectContaining({
        destination: { code: "CFU" },
        departure: "2026-10-09",
        return: "2026-10-12",
        price: 22966,
        currency: "HUF",
        bookingUrl: "https://example.com/flex-flight",
        resultType: "flex",
      }),
    });
  });

  test("does not run fallback flex search when Smart Flex is disabled and base search fails with provider error", async () => {
    appConfig.smartFlex.enabled = false;
    shouldRunFallbackFlex.mockReturnValue(false);

    const onResult = jest.fn();

    const baseResults = [
      {
        success: false,
        reason: "provider_error",
        error: "SerpApi unavailable",
      },
    ];

    runWithConcurrencyLimit.mockImplementationOnce(async (_, __, callback) => {
      baseResults.forEach(callback);

      return baseResults;
    });

    await searchFlightsStream({
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
      onResult,
    });

    expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(1);

    expect(shouldRunFallbackFlex).toHaveBeenCalledWith(baseResults);

    expect(expandControlledFlexibility).not.toHaveBeenCalled();

    expect(onResult).toHaveBeenCalledWith({
      type: "fail",
    });
  });

  test("streams flex results when Smart Flex is enabled", async () => {
    const onResult = jest.fn();

    analyzeFlexResult.mockReturnValue({
      percent: 33,
      diff: 11350,
      reason: "return later",
      type: "return_shift",
      basePrice: 34316,
      flexPrice: 22966,
    });

    runWithConcurrencyLimit
      .mockImplementationOnce(async (_, __, callback) => {
        const results = [
          {
            success: true,
            data: {
              destination: "CFU",
              departure: "2026-10-09",
              return: "2026-10-11",
              price: 34316,
              currency: "HUF",
              bookingUrl: "https://example.com/base-flight",
            },
          },
        ];

        results.forEach(callback);

        return results;
      })
      .mockImplementationOnce(async (_, __, callback) => {
        const results = [
          {
            success: true,
            data: {
              destination: "CFU",
              departure: "2026-10-09",
              return: "2026-10-12",
              price: 22966,
              currency: "HUF",
              bookingUrl: "https://example.com/flex-flight",
              baseDeparture: "2026-10-09",
              baseReturn: "2026-10-11",
            },
          },
        ];

        results.forEach(callback);

        return results;
      });

    await searchFlightsStream({
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
      onResult,
    });

    expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(2);

    expect(onResult).toHaveBeenCalledWith({
      type: "data",
      data: expect.objectContaining({
        destination: { code: "CFU" },
        departure: "2026-10-09",
        return: "2026-10-12",
        price: 22966,
        currency: "HUF",
        bookingUrl: "https://example.com/flex-flight",
        resultType: "flex",
        priceInsight: {
          percent: 33,
          diff: 11350,
          reason: "return later",
          type: "return_shift",
          basePrice: 34316,
          flexPrice: 22966,
        },
      }),
    });

    expect(analyzeFlexResult).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            destination: "CFU",
            departure: "2026-10-09",
            return: "2026-10-11",
            price: 34316,
          }),
        }),
      ]),
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-12",
          price: 22966,
          baseDeparture: "2026-10-09",
          baseReturn: "2026-10-11",
        }),
      }),
    );

    expect(onResult).toHaveBeenCalledWith({
      type: "data",
      data: expect.objectContaining({
        price: 34316,
        resultType: "base",
      }),
    });

    expect(shouldRunFallbackFlex).not.toHaveBeenCalled();
  });
});
