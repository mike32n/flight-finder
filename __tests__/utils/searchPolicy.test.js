const {
  applySearchPolicy,
  getSearchPolicyError,
} = require("../../utils/searchPolicy");

const planDefaults = require("../../config/planDefaults");
const appConfig = require("../../config/appConfig");

let parameters;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-21T12:00:00"));

  parameters = {
    origin: "VIE",
    destinations: ["AMS"],
    weekday: 2,
    nights: 4,
    startDate: "2027-03-01",
  };
});

afterEach(() => {
  jest.useRealTimers();
});

describe("applySearchPolicy", () => {
  test("applies the locked anonymous search settings", () => {
    const result = applySearchPolicy(parameters, planDefaults.anonymous);

    expect(result).toEqual({
      origin: appConfig.departureAirports.default,
      destinations: ["AMS"],
      weekday: 6,
      nights: 1,
      startDate: "2026-10-21",
      allowFlexSearch: false,
    });
  });

  test("preserves the registered user's selected origin", () => {
    const result = applySearchPolicy(parameters, planDefaults.registered);

    expect(result).toEqual({
      origin: "VIE",
      destinations: ["AMS"],
      weekday: 6,
      nights: 1,
      startDate: "2026-10-21",
      allowFlexSearch: true,
    });
  });

  test("preserves premium search choices", () => {
    const result = applySearchPolicy(parameters, planDefaults.premium);

    expect(result).toEqual({
      ...parameters,
      allowFlexSearch: true,
    });
  });

  test("uses today when an allowed start date is omitted", () => {
    delete parameters.startDate;

    const result = applySearchPolicy(parameters, planDefaults.premium);

    expect(result.startDate).toBe("2026-10-21");
  });

  test("uses customized policy settings instead of hardcoded weekend values", () => {
    const policy = {
      ...planDefaults.registered,
      fixedWeekday: 5,
      fixedNights: 2,
      canSelectStartDate: true,
      smartFlexEnabled: false,
    };

    const result = applySearchPolicy(parameters, policy);

    expect(result).toEqual({
      origin: "VIE",
      destinations: ["AMS"],
      weekday: 5,
      nights: 2,
      startDate: "2027-03-01",
      allowFlexSearch: false,
    });
  });

  test("accepts a server-provided default origin", () => {
    const result = applySearchPolicy(parameters, planDefaults.anonymous, {
      defaultOrigin: "BTS",
    });

    expect(result.origin).toBe("BTS");
  });

  test("does not modify the input parameters or policy", () => {
    const policy = { ...planDefaults.registered };

    const originalParameters = {
      ...parameters,
      destinations: [...parameters.destinations],
    };

    const originalPolicy = { ...policy };

    const result = applySearchPolicy(parameters, policy);

    result.destinations.push("LCA");

    expect(parameters).toEqual(originalParameters);
    expect(policy).toEqual(originalPolicy);
  });

  test("does not accept a client-supplied Flex permission", () => {
    parameters.allowFlexSearch = true;

    const result = applySearchPolicy(parameters, planDefaults.anonymous);

    expect(result.allowFlexSearch).toBe(false);
  });
});

describe("getSearchPolicyError", () => {
  test("accepts a search within the plan limit", () => {
    const policy = planDefaults.registered;
    const result = applySearchPolicy(parameters, policy);

    expect(getSearchPolicyError(result, policy)).toBeNull();
  });

  test("rejects too many destinations without trimming them", () => {
    parameters.destinations = ["AMS", "LCA"];

    const policy = planDefaults.anonymous;
    const result = applySearchPolicy(parameters, policy);

    expect(getSearchPolicyError(result, policy)).toBe(
      "Your plan allows up to 1 destination.",
    );

    expect(result.destinations).toEqual(["AMS", "LCA"]);
  });

  test("respects a customized destination limit", () => {
    parameters.destinations = ["AMS", "LCA"];

    const policy = {
      ...planDefaults.registered,
      maxDestinations: 2,
    };

    const result = applySearchPolicy(parameters, policy);

    expect(getSearchPolicyError(result, policy)).toBeNull();

    result.destinations.push("CFU");

    expect(getSearchPolicyError(result, policy)).toBe(
      "Your plan allows up to 2 destinations.",
    );
  });

  test("rejects a destination conflicting with the enforced origin", () => {
    parameters.destinations = [appConfig.departureAirports.default];

    const policy = planDefaults.anonymous;
    const result = applySearchPolicy(parameters, policy);

    expect(getSearchPolicyError(result, policy)).toBe(
      "Departure and destination airports must differ",
    );
  });
});
