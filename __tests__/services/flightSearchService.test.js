jest.mock("../../providers/providerFactory", () => ({
  getProvider: jest.fn(),
}));

jest.mock("../../utils/dateGenerator", () => jest.fn());

jest.mock("../../utils/promisePool", () => jest.fn());

jest.mock("../../services/flexDateGenerator", () => ({
  expandControlledFlexibility: jest.fn(),
}));

jest.mock("../../services/smartFlexService", () => ({
  analyzePriceDelta: jest.fn(),
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

describe("flightSearchService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
      }),
    );

    expect(result.results[1].price).toBe(34316);
    expect(result.results[2].price).toBe(40000);
  });

  test("streams flex results when Smart Flex is enabled", async () => {
    const onResult = jest.fn();

    runWithConcurrencyLimit
      .mockImplementationOnce(async (_, __, callback) => {
        callback({
          success: true,
          data: {
            destination: "CFU",
            departure: "2026-10-09",
            return: "2026-10-11",
            price: 34316,
            currency: "HUF",
            bookingUrl: "https://example.com/base-flight",
          },
        });
      })
      .mockImplementationOnce(async (_, __, callback) => {
        callback({
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
      }),
    });
  });
});
