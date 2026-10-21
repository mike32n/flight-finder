jest.mock("../../providers/providerFactory", () => ({
  getProvider: jest.fn(),
}));

const { getProvider } = require("../../providers/providerFactory");
const appConfig = require("../../config/appConfig");

const searchFlightsMock = jest.fn();

getProvider.mockReturnValue({
  searchFlights: searchFlightsMock,
});

const {
  searchFlights,
  searchFlightsStream,
} = require("../../services/flightSearchService");

const baseTrip = {
  departure: "2027-03-06",
  return: "2027-03-08",
};

function isBaseTrip(departure, returnDate) {
  return departure === baseTrip.departure && returnDate === baseTrip.return;
}

function createFlightResult(destination, departure, returnDate) {
  return {
    success: true,
    data: {
      destination,
      departure,
      return: returnDate,
      price: isBaseTrip(departure, returnDate) ? 30000 : 20000,
      currency: "HUF",
      bookingUrl: "https://example.com/booking",
    },
  };
}

async function executeSearch(mode, overrides = {}) {
  const options = {
    origin: "VIE",
    destinations: ["AMS"],
    weekday: 6,
    nights: 2,
    startDate: "2027-03-01",
    enrichAirport: (code) => ({ code }),
    ...overrides,
  };

  if (mode === "json") {
    const result = await searchFlights(options);
    return result.results;
  }

  const results = [];

  await searchFlightsStream({
    ...options,
    onResult(event) {
      if (event.type === "data") {
        results.push(event.data);
      }
    },
  });

  return results;
}

describe("request-level Flex access", () => {
  const originalSearch = { ...appConfig.search };
  const originalFlex = { ...appConfig.smartFlex };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-21T12:00:00"));

    appConfig.search.weeksToGenerate = 1;
    appConfig.search.maxResults = 5;

    appConfig.smartFlex.enabled = true;
    appConfig.smartFlex.departureShiftDays = 1;
    appConfig.smartFlex.returnShiftDays = 1;

    searchFlightsMock.mockReset();

    searchFlightsMock.mockImplementation(
      async (destination, departure, returnDate) =>
        createFlightResult(destination, departure, returnDate),
    );
  });

  afterEach(() => {
    Object.assign(appConfig.search, originalSearch);
    Object.assign(appConfig.smartFlex, originalFlex);

    jest.useRealTimers();
  });

  test.each(["json", "stream"])(
    "%s skips Smart Flex when the request does not allow it",
    async (mode) => {
      const results = await executeSearch(mode, {
        allowFlexSearch: false,
      });

      expect(searchFlightsMock).toHaveBeenCalledTimes(1);

      expect(searchFlightsMock).toHaveBeenCalledWith(
        "AMS",
        baseTrip.departure,
        baseTrip.return,
        "VIE",
      );

      expect(results.map((result) => result.resultType)).toEqual(["base"]);
    },
  );

  test.each(["json", "stream"])(
    "%s skips fallback Flex when the request does not allow it",
    async (mode) => {
      appConfig.smartFlex.enabled = false;

      searchFlightsMock.mockResolvedValue({
        success: false,
        reason: "no_results",
      });

      const results = await executeSearch(mode, {
        allowFlexSearch: false,
      });

      expect(searchFlightsMock).toHaveBeenCalledTimes(1);
      expect(results).toEqual([]);
    },
  );

  test.each(["json", "stream"])(
    "%s runs Smart Flex when both the request and global setting allow it",
    async (mode) => {
      const results = await executeSearch(mode, {
        allowFlexSearch: true,
      });

      expect(searchFlightsMock).toHaveBeenCalledTimes(3);

      expect(
        results.filter((result) => result.resultType === "base"),
      ).toHaveLength(1);

      expect(
        results.filter((result) => result.resultType === "flex"),
      ).toHaveLength(2);
    },
  );

  test.each(["json", "stream"])(
    "%s preserves fallback Flex when the request allows it",
    async (mode) => {
      appConfig.smartFlex.enabled = false;

      searchFlightsMock.mockImplementation(
        async (destination, departure, returnDate) => {
          if (isBaseTrip(departure, returnDate)) {
            return {
              success: false,
              reason: "no_results",
            };
          }

          return createFlightResult(destination, departure, returnDate);
        },
      );

      const results = await executeSearch(mode, {
        allowFlexSearch: true,
      });

      expect(searchFlightsMock).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(2);

      expect(
        results.every((result) => result.resultType === "fallback-flex"),
      ).toBe(true);
    },
  );

  test.each(["json", "stream"])(
    "%s keeps Flex permissions isolated between requests",
    async (mode) => {
      await executeSearch(mode, {
        allowFlexSearch: false,
      });

      expect(searchFlightsMock).toHaveBeenCalledTimes(1);
      expect(appConfig.smartFlex.enabled).toBe(true);

      searchFlightsMock.mockClear();

      const results = await executeSearch(mode, {
        allowFlexSearch: true,
      });

      expect(searchFlightsMock).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
      expect(appConfig.smartFlex.enabled).toBe(true);
    },
  );
});
