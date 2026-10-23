jest.mock("../../providers/providerFactory", () => ({
  getProvider: jest.fn().mockReturnValue({
    searchFlights: jest.fn(),
  }),
}));

jest.mock("../../config/providerConfig", () => ({
  concurrency: 1,
}));

jest.mock("../../utils/dateGenerator", () => jest.fn());

jest.mock("../../services/flexDateGenerator", () => ({
  expandControlledFlexibility: jest.fn(),
}));

const { getProvider } = require("../../providers/providerFactory");
const generateTrips = require("../../utils/dateGenerator");
const {
  expandControlledFlexibility,
} = require("../../services/flexDateGenerator");
const appConfig = require("../../config/appConfig");
const {
  searchFlights,
  searchFlightsStream,
} = require("../../services/flightSearchService");

const searchMock = getProvider().searchFlights;

const baseTrip = {
  departure: "2027-03-06",
  return: "2027-03-08",
};

const options = {
  origin: "VIE",
  destinations: ["AMS"],
  weekday: 6,
  nights: 2,
  startDate: "2027-03-01",
  enrichAirport: (code) => ({ code }),
};

function flight(destination, departure, returnDate, price = 30000) {
  return {
    success: true,
    data: {
      destination,
      departure,
      return: returnDate,
      price,
    },
  };
}

function execute(mode, overrides, onResult) {
  const parameters = { ...options, ...overrides };

  return mode === "json"
    ? searchFlights(parameters)
    : searchFlightsStream({ ...parameters, onResult });
}

describe("search execution cancellation", () => {
  const originalFlexEnabled = appConfig.smartFlex.enabled;

  beforeEach(() => {
    searchMock.mockReset();

    generateTrips.mockReturnValue([baseTrip]);

    expandControlledFlexibility.mockReset();
    expandControlledFlexibility.mockReturnValue([
      baseTrip,
      { departure: "2027-03-05", return: "2027-03-08" },
      { departure: "2027-03-06", return: "2027-03-09" },
    ]);

    appConfig.smartFlex.enabled = true;
  });

  afterEach(() => {
    appConfig.smartFlex.enabled = originalFlexEnabled;
  });

  test.each([
    ["json", "base"],
    ["stream", "base"],
    ["json", "flex"],
    ["stream", "flex"],
  ])(
    "%s stops queued work and late events during %s cancellation",
    async (mode, phase) => {
      const controller = new AbortController();
      const abortError = new Error("Client disconnected");
      const onResult = jest.fn();

      let finishTask;
      let pendingFlight;
      let notifyStarted;

      const pendingResult = new Promise((resolve) => {
        finishTask = resolve;
      });

      const started = new Promise((resolve) => {
        notifyStarted = resolve;
      });

      searchMock.mockImplementation((destination, departure, returnDate) => {
        const callNumber = searchMock.mock.calls.length;
        const shouldWait = callNumber === (phase === "base" ? 1 : 2);

        if (shouldWait) {
          pendingFlight = flight(destination, departure, returnDate, 20000);

          notifyStarted();
          return pendingResult;
        }

        return Promise.resolve(flight(destination, departure, returnDate));
      });

      const request = execute(
        mode,
        {
          destinations: phase === "base" ? ["AMS", "BCN"] : ["AMS"],
          signal: controller.signal,
        },
        onResult,
      );

      const outcome = request.then(
        (value) => ({ value }),
        (error) => ({ error }),
      );

      await started;

      const callbackCountBeforeAbort = onResult.mock.calls.length;

      controller.abort(abortError);
      finishTask(pendingFlight);

      expect((await outcome).error).toBe(abortError);

      expect(searchMock).toHaveBeenCalledTimes(phase === "base" ? 1 : 2);

      expect(onResult).toHaveBeenCalledTimes(callbackCountBeforeAbort);

      if (phase === "base") {
        expect(expandControlledFlexibility).not.toHaveBeenCalled();
      }
    },
  );

  test("JSON and SSE use the same filtering and provider-failure counting", async () => {
    searchMock.mockImplementation(
      async (destination, departure, returnDate) => {
        if (destination === "BCN") {
          return {
            success: false,
            reason: "provider_error",
            error: "Unavailable",
          };
        }

        if (destination === "LCA") {
          return { success: false, reason: "no_results" };
        }

        const price =
          departure < baseTrip.departure
            ? 20000
            : returnDate > baseTrip.return
              ? 35000
              : 30000;

        return flight(destination, departure, returnDate, price);
      },
    );

    const parameters = {
      ...options,
      destinations: ["AMS", "BCN", "LCA"],
    };

    const summary = await searchFlights(parameters);
    const events = [];

    await searchFlightsStream({
      ...parameters,
      onResult: (event) => events.push(event),
    });

    const streamedResults = events
      .filter((event) => event.type === "data")
      .map((event) => event.data)
      .sort((a, b) => a.price - b.price);

    expect(streamedResults).toEqual(summary.results);

    expect(summary.results.map((result) => result.resultType)).toEqual([
      "flex",
      "base",
    ]);

    expect(summary.failedRequests).toBe(3);

    expect(events.filter((event) => event.type === "fail")).toHaveLength(3);
  });
});
