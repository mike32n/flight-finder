jest.mock("../../providers/providerFactory", () => ({
  getProvider: jest.fn().mockReturnValue({
    searchFlights: jest.fn(),
  }),
}));

jest.mock("../../config/providerConfig", () => ({
  concurrency: 5,
}));

jest.mock("../../models/destinationModel", () => ({
  getAllDestinations: jest.fn().mockResolvedValue([]),
}));

// These tests cover search execution with unrestricted access.
// Authentication and plan enforcement are covered in searchAccess.test.js.
jest.mock("../../middlewares/resolveSearchAccess", () => ({
  resolveSearchAccess(req, res, next) {
    req.searchAccess = {
      plan: "premium",
      policy: {
        ...require("../../config/planDefaults").premium,
      },
    };

    next();
  },
}));

const express = require("express");
const request = require("supertest");
const dayjs = require("dayjs");

const appConfig = require("../../config/appConfig");
const { getProvider } = require("../../providers/providerFactory");
const { router } = require("../../routes/searchRoutes");

const app = express();
app.use(express.json());
app.use("/", router);

const searchFlightsMock = getProvider().searchFlights;

describe("search start date integration", () => {
  let originalWeeks;
  let originalFlex;
  let startDate;

  beforeEach(() => {
    originalWeeks = appConfig.search.weeksToGenerate;
    originalFlex = appConfig.smartFlex.enabled;

    appConfig.search.weeksToGenerate = 2;
    appConfig.smartFlex.enabled = true;

    // A future Saturday, independent of when the test runs.
    startDate = dayjs().add(6, "month").day(6).format("YYYY-MM-DD");

    searchFlightsMock.mockReset();

    searchFlightsMock.mockImplementation(
      async (destination, departure, returnDate) => ({
        success: true,
        data: {
          destination,
          departure,
          return: returnDate,
          price: 30000,
          currency: "HUF",
          bookingUrl: "https://example.com/booking",
        },
      }),
    );
  });

  afterEach(() => {
    appConfig.search.weeksToGenerate = originalWeeks;
    appConfig.smartFlex.enabled = originalFlex;
  });

  test.each([
    ["/search", true],
    ["/search-stream", true],
    ["/search", false],
    ["/search-stream", false],
  ])(
    "%s respects the start date with Smart Flex enabled=%s",
    async (endpoint, smartFlexEnabled) => {
      appConfig.smartFlex.enabled = smartFlexEnabled;

      if (!smartFlexEnabled) {
        // All base searches are empty, triggering fallback Flex.
        searchFlightsMock.mockResolvedValue({
          success: false,
          reason: "no_results",
        });
      }

      const response = await request(app)
        .post(endpoint)
        .send({
          origin: "VIE",
          destinations: ["AMS"],
          weekday: 6,
          nights: 2,
          startDate,
        });

      const firstReturn = dayjs(startDate).add(2, "day").format("YYYY-MM-DD");

      const previousFriday = dayjs(startDate)
        .subtract(1, "day")
        .format("YYYY-MM-DD");

      const nextFriday = dayjs(startDate).add(6, "day").format("YYYY-MM-DD");

      const secondReturn = dayjs(startDate).add(9, "day").format("YYYY-MM-DD");

      expect(response.statusCode).toBe(200);

      // Two base searches + three allowed Flex searches.
      expect(searchFlightsMock).toHaveBeenCalledTimes(5);

      expect(searchFlightsMock).toHaveBeenCalledWith(
        "AMS",
        startDate,
        firstReturn,
        "VIE",
      );

      expect(searchFlightsMock).not.toHaveBeenCalledWith(
        "AMS",
        previousFriday,
        firstReturn,
        "VIE",
      );

      expect(searchFlightsMock).toHaveBeenCalledWith(
        "AMS",
        nextFriday,
        secondReturn,
        "VIE",
      );

      expect(
        searchFlightsMock.mock.calls.every(
          ([, departure]) => departure >= startDate,
        ),
      ).toBe(true);

      if (smartFlexEnabled) {
        if (endpoint === "/search") {
          expect(response.body.results).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                departure: startDate,
                return: firstReturn,
              }),
            ]),
          );
        } else {
          expect(response.text).toContain(`"departure":"${startDate}"`);
          expect(response.text).toContain("event: end");
        }
      }
    },
  );
});
