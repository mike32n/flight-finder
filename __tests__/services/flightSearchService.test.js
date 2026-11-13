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

  test("counts Smart Flex provider errors but not no-results outcomes", async () => {
    runWithConcurrencyLimit
      .mockResolvedValueOnce([
        {
          success: true,
          data: {
            destination: "CFU",
            departure: "2026-10-09",
            return: "2026-10-11",
            price: 30000,
            currency: "HUF",
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          success: false,
          reason: "provider_error",
          error: "Provider timeout",
        },
        {
          success: false,
          reason: "no_results",
        },
      ]);

    const result = await searchFlights({
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
    });

    expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(2);
    expect(result.failedRequests).toBe(1);

    expect(result.results).toEqual([
      expect.objectContaining({
        destination: { code: "CFU" },
        price: 30000,
        resultType: "base",
      }),
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
            currency: "HUF",
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
            currency: "HUF",
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
          currency: "HUF",
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

    shouldRunFallbackFlex.mockImplementation(
      jest.requireActual("../../services/smartFlexService").shouldRunFallbackFlex,
    );
    searchFlightsMock
      .mockResolvedValueOnce({ success: false, reason: "no_results" })
      .mockResolvedValueOnce({ success: false, reason: "no_results" })
      .mockResolvedValueOnce({
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-12",
          price: 22966,
          currency: "HUF",
          bookingUrl: "https://example.com/flex-flight",
        },
      });
    const executeTasks = async (tasks) =>
      Promise.all(tasks.map((task) => task()));
    runWithConcurrencyLimit
      .mockImplementationOnce(executeTasks)
      .mockImplementationOnce(executeTasks);

    try {
      const result = await searchFlights({
        destinations: ["CFU"],
        weekday: 5,
        nights: 2,
        enrichAirport: (code) => ({ code }),
      });

      expect(shouldRunFallbackFlex).toHaveBeenCalledWith([
        { success: false, reason: "no_results" },
      ]);
      expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(2);
      expect(searchFlightsMock).toHaveBeenCalledTimes(3);

      expect(result.results).toEqual([
        expect.objectContaining({
          destination: { code: "CFU" },
          departure: "2026-10-09",
          return: "2026-10-12",
          price: 22966,
          currency: "HUF",
          bookingUrl: "https://example.com/flex-flight",
          resultType: "fallback-flex",
        }),
      ]);

      expect(result.results[0]).not.toHaveProperty("priceInsight");
    } finally {
      searchFlightsMock.mockReset();
    }
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

    shouldRunFallbackFlex.mockImplementation(
      jest.requireActual("../../services/smartFlexService").shouldRunFallbackFlex,
    );
    const baseResults = [
      { success: false, reason: "no_results" },
      { success: false, reason: "provider_error", error: "SerpApi unavailable" },
    ];
    searchFlightsMock
      .mockResolvedValueOnce(baseResults[0])
      .mockResolvedValueOnce(baseResults[1]);
    runWithConcurrencyLimit.mockImplementationOnce(async (tasks) =>
      Promise.all(tasks.map((task) => task())),
    );

    try {
      const result = await searchFlights({
        destinations: ["CFU", "LCA"],
        weekday: 5,
        nights: 2,
        enrichAirport: (code) => ({ code }),
      });

      expect(shouldRunFallbackFlex).toHaveBeenCalledWith(baseResults);
      expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(1);
      expect(searchFlightsMock).toHaveBeenCalledTimes(2);
      expect(expandControlledFlexibility).not.toHaveBeenCalled();
      expect(result.results).toEqual([]);
      expect(result.failedRequests).toBe(1);
    } finally {
      searchFlightsMock.mockReset();
    }
  });

  test("keeps successful base results without fallback when another request fails", async () => {
    appConfig.smartFlex.enabled = false;
    shouldRunFallbackFlex.mockImplementation(
      jest.requireActual("../../services/smartFlexService").shouldRunFallbackFlex,
    );
    const baseResults = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-11",
          price: 30000,
          currency: "HUF",
        },
      },
      { success: false, reason: "provider_error", error: "Provider unavailable" },
    ];
    runWithConcurrencyLimit.mockResolvedValueOnce(baseResults);

    const result = await searchFlights({
      destinations: ["CFU", "LCA"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
    });

    expect(shouldRunFallbackFlex).toHaveBeenCalledWith(baseResults);
    expect(runWithConcurrencyLimit).toHaveBeenCalledTimes(1);
    expect(expandControlledFlexibility).not.toHaveBeenCalled();
    expect(result.failedRequests).toBe(1);
    expect(result.results).toEqual([
      expect.objectContaining({
        destination: { code: "CFU" },
        departure: "2026-10-09",
        return: "2026-10-11",
        price: 30000,
        resultType: "base",
      }),
    ]);
  });

  test("returns cheaper flex result before the base result", async () => {
    analyzeFlexResult.mockImplementation((_, result) => {
      if (result.data.price === 22966) {
        return {
          percent: 33,
          diff: 11350,
          reason: "return later",
          type: "return_shift",
          basePrice: 34316,
          flexPrice: 22966,
        };
      }

      return null;
    });

    runWithConcurrencyLimit
      .mockResolvedValueOnce([
        {
          success: true,
          data: {
            destination: "CFU",
            departure: "2026-10-09",
            return: "2026-10-11",
            price: 34316,
            currency: "HUF",
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
            currency: "HUF",
          },
        },
        {
          success: true,
          data: {
            destination: "CFU",
            departure: "2026-10-09",
            return: "2026-10-12",
            price: 22966,
            currency: "HUF",
          },
        },
      ]);

    const result = await searchFlights({
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
    });

    expect(result.results).toHaveLength(2);

    expect(result.results[0]).toEqual(
      expect.objectContaining({
        destination: { code: "CFU" },
        departure: "2026-10-09",
        return: "2026-10-12",
        price: 22966,
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
    );

    expect(result.results[1]).toEqual(
      expect.objectContaining({
        price: 34316,
        resultType: "base",
      }),
    );

    expect(result.results).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          price: 40000,
        }),
      ]),
    );

    expect(result.results[1]).not.toHaveProperty("priceInsight");
  });

  test("retains equal-priced cheaper Flex trips in their original order", async () => {
    analyzeFlexResult.mockImplementation(
      jest.requireActual("../../services/smartFlexService").analyzeFlexResult,
    );
    const base = {
      success: true,
      data: {
        destination: "CFU",
        departure: "2026-10-09",
        return: "2026-10-11",
        price: 30000,
        currency: "HUF",
      },
    };
    const flex = [
      { departure: "2026-10-08", return: "2026-10-11" },
      { departure: "2026-10-09", return: "2026-10-12" },
    ].map((trip) => ({
      success: true,
      data: {
        ...trip,
        destination: "CFU",
        price: 20000,
        currency: "HUF",
        baseDeparture: base.data.departure,
        baseReturn: base.data.return,
      },
    }));
    runWithConcurrencyLimit
      .mockResolvedValueOnce([base])
      .mockResolvedValueOnce(flex);

    const result = await searchFlights({
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      enrichAirport: (code) => ({ code }),
    });

    expect(result.results.map((item) => ({
      destination: item.destination.code,
      departure: item.departure,
      return: item.return,
      price: item.price,
      resultType: item.resultType,
    }))).toEqual([
      {
        destination: "CFU",
        departure: "2026-10-08",
        return: "2026-10-11",
        price: 20000,
        resultType: "flex",
      },
      {
        destination: "CFU",
        departure: "2026-10-09",
        return: "2026-10-12",
        price: 20000,
        resultType: "flex",
      },
      {
        destination: "CFU",
        departure: "2026-10-09",
        return: "2026-10-11",
        price: 30000,
        resultType: "base",
      },
    ]);
  });

  test.each(["json", "stream"])(
    "%s deduplicates results across base and Flex searches",
    async (mode) => {
      const baseTrip = { departure: "2026-10-09", return: "2026-10-11" };
      const earlierTrip = { departure: "2026-10-08", return: "2026-10-11" };
      const laterReturn = { departure: "2026-10-09", return: "2026-10-12" };
      const callsByTrip = new Map();

      generateTrips.mockReturnValue([baseTrip, earlierTrip]);
      expandControlledFlexibility.mockImplementation((trip) =>
        trip.departure === baseTrip.departure
          ? [trip, earlierTrip, laterReturn]
          : [trip],
      );
      analyzeFlexResult.mockReturnValue({ reason: "return later" });
      searchFlightsMock.mockImplementation(
        async (destination, departure, returnDate) => {
          const key = `${destination}-${departure}-${returnDate}`;
          const count = (callsByTrip.get(key) || 0) + 1;
          callsByTrip.set(key, count);

          if (destination === "AMS" && returnDate === laterReturn.return) {
            return { success: false, reason: "no_results" };
          }

          let price;
          if (count > 1) {
            price = 10000;
          } else if (returnDate === laterReturn.return) {
            price = 20000;
          } else if (departure === earlierTrip.departure) {
            price = destination === "CFU" ? 26000 : 27000;
          } else {
            price = destination === "CFU" ? 30000 : 31000;
          }

          return {
            success: true,
            data: {
              destination,
              departure,
              return: returnDate,
              price,
              currency: "HUF",
            },
          };
        },
      );

      const executeTasks = async (tasks, limit, onResult) => {
        const results = await Promise.all(tasks.map((task) => task()));
        if (onResult) results.forEach(onResult);
        return results;
      };
      runWithConcurrencyLimit
        .mockImplementationOnce(executeTasks)
        .mockImplementationOnce(executeTasks);

      const options = {
        origin: "VIE",
        destinations: ["CFU", "AMS"],
        weekday: 5,
        nights: 2,
        enrichAirport: (code) => ({ code }),
      };

      try {
        let results;
        if (mode === "json") {
          results = (await searchFlights(options)).results;
        } else {
          const events = [];
          await searchFlightsStream({
            ...options,
            onResult: (event) => events.push(event),
          });
          results = events
            .filter((event) => event.type === "data")
            .map((event) => event.data)
            .sort((a, b) => a.price - b.price);
        }

        expect(searchFlightsMock).toHaveBeenCalledTimes(8);
        expect(results.map((result) => ({
          origin: result.origin.code,
          destination: result.destination.code,
          departure: result.departure,
          return: result.return,
          price: result.price,
          resultType: result.resultType,
        }))).toEqual([
          { origin: "VIE", destination: "CFU", ...laterReturn, price: 20000, resultType: "flex" },
          { origin: "VIE", destination: "CFU", ...earlierTrip, price: 26000, resultType: "base" },
          { origin: "VIE", destination: "AMS", ...earlierTrip, price: 27000, resultType: "base" },
          { origin: "VIE", destination: "CFU", ...baseTrip, price: 30000, resultType: "base" },
          { origin: "VIE", destination: "AMS", ...baseTrip, price: 31000, resultType: "base" },
        ]);
      } finally {
        searchFlightsMock.mockReset();
      }
    },
  );

  test("returns the five cheapest distinct valid results in price order", async () => {
    const candidates = [
      ["2027-03-06", "2027-03-08", 70000],
      ["2027-03-13", "2027-03-15", 60000],
      ["2027-03-20", "2027-03-22", 10000],
      ["2027-03-06", "2027-03-08", 1000],
      ["2027-05-01", "2027-05-03", -1],
      ["2027-03-27", "2027-03-29", 50000],
      ["2027-04-03", "2027-04-05", 20000],
      ["2027-04-10", "2027-04-12", 40000],
      ["2027-04-17", "2027-04-19", 30000],
    ];
    runWithConcurrencyLimit.mockResolvedValueOnce(
      candidates.map(([departure, returnDate, price]) => ({
        success: true,
        data: {
          destination: "CFU",
          departure,
          return: returnDate,
          price,
          currency: "HUF",
        },
      })),
    );

    const result = await searchFlights({
      origin: "VIE",
      destinations: ["CFU"],
      weekday: 5,
      nights: 2,
      allowFlexSearch: false,
      enrichAirport: (code) => ({ code }),
    });

    expect(result.failedRequests).toBe(1);
    expect(result.results.map((item) => ({
      origin: item.origin.code,
      destination: item.destination.code,
      departure: item.departure,
      return: item.return,
      price: item.price,
    }))).toEqual([
      {
        origin: "VIE", destination: "CFU",
        departure: "2027-03-20", return: "2027-03-22", price: 10000,
      },
      {
        origin: "VIE", destination: "CFU",
        departure: "2027-04-03", return: "2027-04-05", price: 20000,
      },
      {
        origin: "VIE", destination: "CFU",
        departure: "2027-04-17", return: "2027-04-19", price: 30000,
      },
      {
        origin: "VIE", destination: "CFU",
        departure: "2027-04-10", return: "2027-04-12", price: 40000,
      },
      {
        origin: "VIE", destination: "CFU",
        departure: "2027-03-27", return: "2027-03-29", price: 50000,
      },
    ]);
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
        resultType: "fallback-flex",
      }),
    });

    expect(analyzeFlexResult).not.toHaveBeenCalled();
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

  test("does not stream flex result when it is not cheaper than its base trip", async () => {
    const onResult = jest.fn();

    analyzeFlexResult.mockReturnValue(null);

    runWithConcurrencyLimit
      .mockImplementationOnce(async (_, __, callback) => {
        const results = [
          {
            success: true,
            data: {
              destination: "CFU",
              departure: "2026-10-09",
              return: "2026-10-11",
              price: 30000,
              currency: "HUF",
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
              price: 35000,
              baseDeparture: "2026-10-09",
              baseReturn: "2026-10-11",
              currency: "HUF",
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

    expect(analyzeFlexResult).toHaveBeenCalled();

    expect(onResult).toHaveBeenCalledWith({
      type: "data",
      data: expect.objectContaining({
        price: 30000,
        resultType: "base",
      }),
    });

    expect(onResult).not.toHaveBeenCalledWith({
      type: "data",
      data: expect.objectContaining({
        price: 35000,
        resultType: "flex",
      }),
    });
  });

  test("returns no data when both base and fallback flex searches have no results", async () => {
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
            success: false,
            reason: "no_results",
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

    expect(onResult).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: "data",
      }),
    );

    expect(onResult).not.toHaveBeenCalledWith({
      type: "fail",
    });
  });

  test.each(["json", "stream"])(
    "passes selected origin to base and Flex searches in %s mode",
    async (mode) => {
      searchFlightsMock.mockImplementation(
        async (destination, departure, returnDate) => ({
          success: true,
          data: {
            destination,
            departure,
            return: returnDate,
            price: 30000,
            currency: "HUF",
          },
        }),
      );

      const executeTasks = async (tasks, limit, onResult) => {
        const results = await Promise.all(tasks.map((task) => task()));
        if (onResult) results.forEach(onResult);
        return results;
      };

      runWithConcurrencyLimit
        .mockImplementationOnce(executeTasks)
        .mockImplementationOnce(executeTasks);

      const options = {
        origin: "VIE",
        destinations: ["AMS"],
        weekday: 5,
        nights: 2,
        enrichAirport: (code) => ({ code }),
      };

      if (mode === "json") {
        const result = await searchFlights(options);
        expect(result.results[0].origin).toEqual({ code: "VIE" });
      } else {
        const onResult = jest.fn();
        await searchFlightsStream({ ...options, onResult });
        expect(onResult).toHaveBeenCalledWith({
          type: "data",
          data: expect.objectContaining({ origin: { code: "VIE" } }),
        });
      }

      expect(searchFlightsMock).toHaveBeenCalledTimes(3);
      expect(searchFlightsMock.mock.calls.map((args) => args[3])).toEqual([
        "VIE",
        "VIE",
        "VIE",
      ]);
    },
  );
});
