const planDefaults = require("../../config/planDefaults");
const { applySearchAccess } = require("../../middlewares/applySearchAccess");

describe("applySearchAccess", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-21T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function runMiddleware({
    plan = "anonymous",
    policy = planDefaults[plan],
    parameters = {},
  } = {}) {
    const req = {
      body: {
        origin: "VIE",
        destinations: ["AMS"],
        weekday: 2,
        nights: 3,
        startDate: "2026-11-01",
        ...parameters,
      },
      searchAccess: { plan, policy },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const next = jest.fn();

    applySearchAccess(req, res, next);

    return { req, res, next };
  }

  test.each([
    [
      "anonymous",
      {
        origin: "BUD",
        weekday: 6,
        nights: 1,
        startDate: "2026-10-21",
        allowFlexSearch: false,
      },
    ],
    [
      "registered",
      {
        origin: "VIE",
        weekday: 6,
        nights: 1,
        startDate: "2026-10-21",
        allowFlexSearch: true,
      },
    ],
    [
      "premium",
      {
        origin: "VIE",
        weekday: 2,
        nights: 3,
        startDate: "2026-11-01",
        allowFlexSearch: true,
      },
    ],
  ])("applies the %s policy", (plan, expected) => {
    const { req, res, next } = runMiddleware({ plan });

    expect(req.searchParameters).toEqual({
      destinations: ["AMS"],
      ...expected,
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("does not allow the request body to enable Smart Flex", () => {
    const { req, next } = runMiddleware({
      parameters: {
        allowFlexSearch: true,
        smartFlexEnabled: true,
      },
    });

    expect(req.searchParameters.allowFlexSearch).toBe(false);
    expect(req.searchParameters).not.toHaveProperty("smartFlexEnabled");
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("rejects destinations exceeding the plan limit", () => {
    const { req, res, next } = runMiddleware({
      parameters: {
        destinations: ["AMS", "BCN"],
      },
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Your plan allows up to 1 destination.",
    });

    expect(req).not.toHaveProperty("searchParameters");
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects a destination matching the effective origin", () => {
    const { req, res, next } = runMiddleware({
      parameters: {
        origin: "VIE",
        destinations: ["BUD"],
      },
    });

    // The anonymous policy changes the effective origin to BUD.
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Departure and destination airports must differ",
    });

    expect(req).not.toHaveProperty("searchParameters");
    expect(next).not.toHaveBeenCalled();
  });

  test("uses the resolved policy rather than defaults for the plan name", () => {
    const { req, next } = runMiddleware({
      plan: "premium",
      policy: {
        ...planDefaults.premium,
        canSelectWeekday: false,
        fixedWeekday: 4,
        smartFlexEnabled: false,
      },
    });

    expect(req.searchParameters.weekday).toBe(4);
    expect(req.searchParameters.allowFlexSearch).toBe(false);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("keeps the submitted parameters separate from effective parameters", () => {
    const { req } = runMiddleware();

    expect(req.body).toEqual({
      origin: "VIE",
      destinations: ["AMS"],
      weekday: 2,
      nights: 3,
      startDate: "2026-11-01",
    });

    expect(req.searchParameters).not.toBe(req.body);
    expect(req.searchParameters.destinations).not.toBe(req.body.destinations);
  });
});
