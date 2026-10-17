const getPlanPolicyError = require("../../utils/planPolicyValidator");
const planDefaults = require("../../config/planDefaults");
const appConfig = require("../../config/appConfig");

describe("getPlanPolicyError", () => {
  let policy;

  beforeEach(() => {
    policy = {
      ...planDefaults.premium,
    };
  });

  test.each(Object.keys(planDefaults))(
    "accepts the default policy for %s",
    (plan) => {
      expect(getPlanPolicyError(planDefaults[plan])).toBeNull();
    },
  );

  test.each(
    [undefined, null, [], "premium", 123, true].map((value) => [value]),
  )("rejects a non-object policy: %p", (value) => {
    expect(getPlanPolicyError(value)).toBe("Invalid plan policy");
  });

  test("rejects a missing field", () => {
    delete policy.adsEnabled;

    expect(getPlanPolicyError(policy)).toBe("Invalid plan policy fields");
  });

  test("rejects an unknown field", () => {
    policy.isAdmin = true;

    expect(getPlanPolicyError(policy)).toBe("Invalid plan policy fields");
  });

  test("does not accept inherited fields as policy fields", () => {
    const inheritedPolicy = Object.create(planDefaults.premium);

    expect(getPlanPolicyError(inheritedPolicy)).toBe(
      "Invalid plan policy fields",
    );
  });

  test.each([
    "canSelectOrigin",
    "canSelectWeekday",
    "canSelectNights",
    "canSelectStartDate",
    "smartFlexEnabled",
    "searchHistoryEnabled",
    "favouritesEnabled",
    "adsEnabled",
  ])("requires a boolean value for %s", (field) => {
    for (const value of ["true", 1, null]) {
      policy[field] = value;

      expect(getPlanPolicyError(policy)).toBe(`Invalid ${field}`);
    }
  });

  test.each([0, -1, 1.5, "2", null, NaN])(
    "rejects an invalid destination limit: %p",
    (value) => {
      policy.maxDestinations = value;

      expect(getPlanPolicyError(policy)).toBe("Invalid maxDestinations");
    },
  );

  test("rejects a destination limit above the global maximum", () => {
    policy.maxDestinations = appConfig.destinations.maxSelected + 1;

    expect(getPlanPolicyError(policy)).toBe("Invalid maxDestinations");
  });

  test.each([-1, 7, 2.5, "6", null])(
    "rejects an invalid fixed weekday: %p",
    (value) => {
      policy.fixedWeekday = value;

      expect(getPlanPolicyError(policy)).toBe("Invalid fixedWeekday");
    },
  );

  test.each([0, -1, 1.5, "1", null])(
    "rejects an invalid fixed night count: %p",
    (value) => {
      policy.fixedNights = value;

      expect(getPlanPolicyError(policy)).toBe("Invalid fixedNights");
    },
  );

  test("rejects fixed nights above the global maximum", () => {
    policy.fixedNights = appConfig.search.maxNights + 1;

    expect(getPlanPolicyError(policy)).toBe("Invalid fixedNights");
  });

  test("accepts the lower numeric boundaries", () => {
    policy.maxDestinations = 1;
    policy.fixedWeekday = 0;
    policy.fixedNights = 1;

    expect(getPlanPolicyError(policy)).toBeNull();
  });

  test("accepts the upper numeric boundaries", () => {
    policy.maxDestinations = appConfig.destinations.maxSelected;
    policy.fixedWeekday = 6;
    policy.fixedNights = appConfig.search.maxNights;

    expect(getPlanPolicyError(policy)).toBeNull();
  });

  test("does not modify the supplied policy", () => {
    const original = { ...policy };

    getPlanPolicyError(policy);

    expect(policy).toEqual(original);
  });
});
