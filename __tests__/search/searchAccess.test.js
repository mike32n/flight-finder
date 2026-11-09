jest.mock("../../models/userModel", () => ({
  findUserById: jest.fn(),
}));

jest.mock("../../models/planPolicyModel", () => ({
  findPlanPolicyByName: jest.fn(),
}));

jest.mock("../../models/destinationModel", () => ({
  getAllDestinations: jest.fn().mockResolvedValue([]),
}));

jest.mock("../../services/flightSearchService", () => ({
  searchFlights: jest.fn(),
  searchFlightsStream: jest.fn(),
}));

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const dayjs = require("dayjs");

const appConfig = require("../../config/appConfig");
const planDefaults = require("../../config/planDefaults");
const { findUserById } = require("../../models/userModel");
const { findPlanPolicyByName } = require("../../models/planPolicyModel");
const {
  searchFlights,
  searchFlightsStream,
} = require("../../services/flightSearchService");
const { router } = require("../../routes/searchRoutes");

const app = express();
app.use(express.json());
app.use("/", router);

describe.each(["/search", "/search-stream"])("%s search access", (endpoint) => {
  let policies;
  let parameters;

  beforeEach(() => {
    jest.clearAllMocks();

    policies = Object.fromEntries(
      Object.entries(planDefaults).map(([plan, policy]) => [
        plan,
        { ...policy },
      ]),
    );

    parameters = {
      origin: "VIE",
      destinations: ["AMS"],
      weekday: 2,
      nights: 3,
      startDate: dayjs().add(1, "month").format("YYYY-MM-DD"),
    };

    findUserById.mockResolvedValue({
      id: 1,
      email: "search@example.com",
      email_verified: 1,
      plan: "premium",
      is_admin: 0,
      smart_flex_preference: true,
    });

    findPlanPolicyByName.mockImplementation(async (plan) => ({
      plan,
      policy_json: JSON.stringify(policies[plan]),
    }));

    searchFlights.mockResolvedValue({ results: [] });
    searchFlightsStream.mockResolvedValue(undefined);
  });

  function createToken() {
    return jwt.sign(
      {
        userId: 1,
        // Access must come from the database, not these claims.
        plan: "premium",
        isAdmin: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
  }

  function submit(token) {
    const pendingRequest = request(app).post(endpoint);

    if (token !== undefined) {
      pendingRequest.set("Authorization", `Bearer ${token}`);
    }

    return pendingRequest.send(parameters);
  }

  function searchMock() {
    return endpoint === "/search" ? searchFlights : searchFlightsStream;
  }

  function expectNoSearch() {
    expect(searchFlights).not.toHaveBeenCalled();
    expect(searchFlightsStream).not.toHaveBeenCalled();
  }

  test.each([
    ["anonymous", true, null, true],
    ["anonymous", false, null, false],
    ["registered", true, true, true],
    ["registered", true, false, false],
    ["registered", false, true, false],
    ["registered", false, false, false],
    ["premium", true, true, true],
    ["premium", true, false, false],
    ["premium", false, true, false],
    ["premium", false, false, false],
  ])(
    "applies %s policy=%s preference=%s as %s",
    async (plan, allowed, preference, expected) => {
      policies[plan].smartFlexEnabled = allowed;

      if (plan === "anonymous") {
        parameters.smartFlexPreference = !allowed;
        parameters.allowFlexSearch = !allowed;
      } else {
        findUserById.mockResolvedValue({
          id: 1,
          email: "search@example.com",
          email_verified: 1,
          plan,
          is_admin: 0,
          smart_flex_preference: preference,
        });
      }

      const response = await submit(
        plan === "anonymous" ? undefined : createToken(),
      );

      expect(response.statusCode).toBe(200);
      expect(searchMock()).toHaveBeenCalledWith(
        expect.objectContaining({ allowFlexSearch: expected }),
      );
      expect(searchMock().mock.calls[0][0]).not.toHaveProperty(
        "smartFlexPreference",
      );
      if (plan === "anonymous") {
        expect(findUserById).not.toHaveBeenCalled();
      }
    },
  );

  test.each([undefined, null, 0, 1, "true"])(
    "rejects an invalid authenticated preference: %p",
    async (preference) => {
      findUserById.mockResolvedValue({
        id: 1,
        email: "search@example.com",
        email_verified: 1,
        plan: "premium",
        is_admin: 0,
        smart_flex_preference: preference,
      });
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      try {
        const response = await submit(createToken());

        expect(response.statusCode).toBe(500);
        expectNoSearch();
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    },
  );

  test.each([
    [false, true, true, false],
    [true, false, true, false],
    [true, true, false, true],
  ])(
    "ignores body permissions when preference=%s policy=%s and body=%s",
    async (preference, allowed, submitted, expected) => {
      findUserById.mockResolvedValue({
        id: 1,
        email: "search@example.com",
        email_verified: 1,
        plan: "premium",
        is_admin: 0,
        smart_flex_preference: preference,
      });
      policies.premium.smartFlexEnabled = allowed;
      parameters.smartFlexPreference = submitted;
      parameters.allowFlexSearch = submitted;

      const response = await submit(createToken());

      expect(response.statusCode).toBe(200);
      const searchParameters = searchMock().mock.calls[0][0];
      expect(searchParameters.allowFlexSearch).toBe(expected);
      expect(searchParameters).not.toHaveProperty("smartFlexPreference");
    },
  );

  test("applies anonymous restrictions and ignores submitted privileges", async () => {
    parameters.allowFlexSearch = true;
    parameters.plan = "premium";
    parameters.isAdmin = true;

    const response = await submit();

    expect(response.statusCode).toBe(200);
    expect(findUserById).not.toHaveBeenCalled();
    expect(findPlanPolicyByName).toHaveBeenCalledWith("anonymous");

    expect(searchMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: appConfig.departureAirports.default,
        destinations: ["AMS"],
        weekday: 6,
        nights: 1,
        startDate: dayjs().format("YYYY-MM-DD"),
        allowFlexSearch: false,
      }),
    );
  });

  test("preserves premium search parameters", async () => {
    const response = await submit(createToken());

    expect(response.statusCode).toBe(200);
    expect(findUserById).toHaveBeenCalledWith(1);
    expect(findPlanPolicyByName).toHaveBeenCalledWith("premium");

    expect(searchMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        ...parameters,
        allowFlexSearch: true,
      }),
    );
  });

  test("uses the stored plan even for an administrator with premium token claims", async () => {
    findUserById.mockResolvedValue({
      id: 1,
      email: "admin@example.com",
      email_verified: 1,
      plan: "registered",
      is_admin: 1,
      smart_flex_preference: true,
    });

    const response = await submit(createToken());

    expect(response.statusCode).toBe(200);
    expect(findPlanPolicyByName).toHaveBeenCalledWith("registered");

    expect(searchMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "VIE",
        weekday: 6,
        nights: 1,
        startDate: dayjs().format("YYYY-MM-DD"),
        allowFlexSearch: true,
      }),
    );
  });

  test("rejects destinations exceeding the anonymous limit", async () => {
    parameters.destinations = ["AMS", "BCN"];

    const response = await submit();

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "Your plan allows up to 1 destination.",
    });
    expect(response.headers["content-type"]).toMatch(/application\/json/);

    expectNoSearch();
  });

  test("rejects a destination matching the policy-selected origin", async () => {
    parameters.destinations = [appConfig.departureAirports.default];

    const response = await submit();

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "Departure and destination airports must differ",
    });

    expectNoSearch();
  });

  test("rejects an invalid token instead of using anonymous access", async () => {
    const response = await submit("invalid-token");

    expect(response.statusCode).toBe(401);
    expect(findPlanPolicyByName).not.toHaveBeenCalled();

    expectNoSearch();
  });

  test("rejects a token belonging to a deleted user", async () => {
    findUserById.mockResolvedValue(null);

    const response = await submit(createToken());

    expect(response.statusCode).toBe(401);
    expect(findPlanPolicyByName).not.toHaveBeenCalled();

    expectNoSearch();
  });

  test("applies policy changes to the next request with the same token", async () => {
    const token = createToken();

    const firstResponse = await submit(token);

    expect(firstResponse.statusCode).toBe(200);
    expect(searchMock()).toHaveBeenLastCalledWith(
      expect.objectContaining({
        weekday: 2,
        allowFlexSearch: true,
      }),
    );

    policies.premium.canSelectWeekday = false;
    policies.premium.fixedWeekday = 4;
    policies.premium.smartFlexEnabled = false;

    const secondResponse = await submit(token);

    expect(secondResponse.statusCode).toBe(200);
    expect(searchMock()).toHaveBeenLastCalledWith(
      expect.objectContaining({
        weekday: 4,
        allowFlexSearch: false,
      }),
    );

    expect(findPlanPolicyByName).toHaveBeenCalledTimes(2);
  });

  test.each([{ destinations: ["XXX"] }, { destinations: ["AMS", "XXX"] }])(
    "rejects unsupported destination codes: %p",
    async ({ destinations }) => {
      parameters.destinations = destinations;

      const response = await submit(createToken());

      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({
        error: "Invalid destinations",
      });

      expect(response.headers["content-type"]).toMatch(/application\/json/);

      expectNoSearch();
    },
  );
});
