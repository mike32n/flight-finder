const validateSearch = require("../../middlewares/validateSearch");
const appConfig = require("../../config/appConfig");
const airports = require("../../data/airports");

const destinationCodes = airports
  .map(({ iata }) => iata)
  .filter((code) => code !== appConfig.departureAirports.default);

describe("validateSearch", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {
        destinations: ["BCN"],
        weekday: 2,
        nights: 3,
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  test("calls next for valid payload", () => {
    validateSearch(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test.each([
    { destinations: [] },
    { destinations: "BCN" },
    { destinations: [null] },
    { destinations: [123] },
    { destinations: [{}] },
    { destinations: [""] },
    { destinations: ["lca"] },
    { destinations: ["LC"] },
    { destinations: ["LCAA"] },
    { destinations: ["LC1"] },
    { destinations: [" LCA"] },
    { destinations: ["LCA\n"] },
    { destinations: ["BCN", null] },
    { destinations: ["LCA", "LCA"] },
    { destinations: ["XXX"] },
    { destinations: ["BCN", "XXX"] },
  ])("rejects invalid destinations: %p", ({ destinations }) => {
    req.body.destinations = destinations;

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid destinations",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test.each([-1, 7, 2.5, "2"])("rejects invalid weekday %p", (weekday) => {
    req.body.weekday = weekday;

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test.each([0, 2.5, "3"])("rejects invalid nights %p", (nights) => {
    req.body.nights = nights;

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("rejects too many destinations", () => {
    req.body.destinations = destinationCodes.slice(
      0,
      appConfig.destinations.maxSelected + 1,
    );

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid destinations",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("accepts maximum allowed destinations", () => {
    req.body.destinations = destinationCodes.slice(
      0,
      appConfig.destinations.maxSelected,
    );

    validateSearch(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("rejects nights above configured maximum", () => {
    req.body = {
      destinations: ["CFU"],
      weekday: 5,
      nights: appConfig.search.maxNights + 1,
    };

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid nights",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("accepts configured maximum nights", () => {
    req.body = {
      destinations: ["CFU"],
      weekday: 5,
      nights: appConfig.search.maxNights,
    };

    validateSearch(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test("uses configured default origin when omitted", () => {
    validateSearch(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.origin).toBe(appConfig.departureAirports.default);
  });

  test.each(airports.map(({ iata }) => [iata]))(
    "accepts airport list origin %s",
    (origin) => {
      req.body.origin = origin;
      req.body.destinations = [origin === "AMS" ? "BCN" : "AMS"];

      validateSearch(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body.origin).toBe(origin);
      expect(res.status).not.toHaveBeenCalled();
    },
  );

  test.each(
    [null, "", "vie", "VIE\n", "XXX", ["BUD", "VIE"], {}, 123].map((origin) => [
      origin,
    ]),
  )("rejects invalid origin %p", (origin) => {
    req.body.origin = origin;
    validateSearch(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid origin" });
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects destination equal to origin", () => {
    req.body.origin = "VIE";
    req.body.destinations = ["VIE"];
    validateSearch(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Departure and destination airports must differ",
    });
    expect(next).not.toHaveBeenCalled();
  });

  describe("start date validation", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-10-14T12:00:00"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test.each(["2026-10-14", "2027-03-01"])(
      "accepts and preserves a valid start date: %s",
      (startDate) => {
        req.body.startDate = startDate;

        validateSearch(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
        expect(req.body.startDate).toBe(startDate);
      },
    );

    test("normalizes an empty start date to an omitted field", () => {
      req.body.startDate = "";

      validateSearch(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body).not.toHaveProperty("startDate");
    });

    test.each([
      [null, "Invalid start date"],
      ["2027-02-29", "Invalid start date"],
      ["2026-10-13", "Start date cannot be in the past"],
    ])("rejects %p with the expected error", (startDate, error) => {
      req.body.startDate = startDate;

      validateSearch(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error });
      expect(next).not.toHaveBeenCalled();
    });

    test.each(
      [undefined, null, [], "invalid", 123, true].map((body) => [body]),
    )("rejects malformed request body: %p", (body) => {
      req.body = body;

      validateSearch(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid search payload",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
