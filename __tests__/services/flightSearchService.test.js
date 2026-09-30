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
});
