jest.mock("../../models/planPolicyModel", () => ({
  findPlanPolicyByName: jest.fn(),
}));

const { getPlanPolicy } = require("../../services/planPolicyService");
const planDefaults = require("../../config/planDefaults");
const { findPlanPolicyByName } = require("../../models/planPolicyModel");

describe("getPlanPolicy", () => {
  beforeEach(() => {
    findPlanPolicyByName.mockReset();

    findPlanPolicyByName.mockImplementation(async (plan) => ({
      plan,
      policy_json: JSON.stringify(planDefaults[plan]),
    }));
  });

  test("restricts anonymous users to a fixed weekend search", async () => {
    const policy = await getPlanPolicy("anonymous");

    expect(policy).toEqual(
      expect.objectContaining({
        canSelectOrigin: false,
        maxDestinations: 1,
        canSelectWeekday: false,
        fixedWeekday: 6,
        canSelectNights: false,
        fixedNights: 1,
        canSelectStartDate: false,
        smartFlexEnabled: false,
      }),
    );
  });

  test("allows registered users to select origin and use Smart Flex", async () => {
    const policy = await getPlanPolicy("registered");

    expect(policy).toEqual(
      expect.objectContaining({
        canSelectOrigin: true,
        canSelectWeekday: false,
        canSelectNights: false,
        canSelectStartDate: false,
        smartFlexEnabled: true,
        searchHistoryEnabled: true,
        favouritesEnabled: true,
        adsEnabled: true,
      }),
    );
  });

  test("allows premium users to customize trip dates without ads", async () => {
    const policy = await getPlanPolicy("premium");

    expect(policy).toEqual(
      expect.objectContaining({
        canSelectOrigin: true,
        canSelectWeekday: true,
        canSelectNights: true,
        canSelectStartDate: true,
        smartFlexEnabled: true,
        adsEnabled: false,
      }),
    );
  });

  test("returns an independent policy for each call", async () => {
    const original = await getPlanPolicy("registered");
    const modified = await getPlanPolicy("registered");

    modified.maxDestinations = 999;
    modified.canSelectWeekday = true;

    const reloaded = await getPlanPolicy("registered");

    expect(reloaded).toEqual(original);
    expect(reloaded).not.toBe(original);
  });

  test.each(
    [
      undefined,
      null,
      "",
      "admin",
      "Premium",
      "unknown",
      "constructor",
      "__proto__",
      123,
      {},
      [],
    ].map((plan) => [plan]),
  )("rejects an unknown or invalid plan: %p", async (plan) => {
    await expect(getPlanPolicy(plan)).rejects.toThrow("Unknown plan");
  });

  test("returns the stored policy instead of the defaults", async () => {
    const customPolicy = {
      ...planDefaults.registered,
      maxDestinations: 1,
      canSelectStartDate: true,
    };

    findPlanPolicyByName.mockResolvedValue({
      plan: "registered",
      policy_json: JSON.stringify(customPolicy),
    });

    const policy = await getPlanPolicy("registered");

    expect(findPlanPolicyByName).toHaveBeenCalledWith("registered");
    expect(policy).toEqual(customPolicy);
  });

  test("rejects a missing stored policy", async () => {
    findPlanPolicyByName.mockResolvedValue(null);

    await expect(getPlanPolicy("premium")).rejects.toThrow(
      "Missing policy for premium",
    );
  });

  test("rejects invalid stored JSON", async () => {
    findPlanPolicyByName.mockResolvedValue({
      plan: "premium",
      policy_json: "{invalid-json",
    });

    await expect(getPlanPolicy("premium")).rejects.toThrow(
      "Invalid stored policy for premium: invalid JSON",
    );
  });

  test("rejects an invalid stored configuration", async () => {
    findPlanPolicyByName.mockResolvedValue({
      plan: "premium",
      policy_json: JSON.stringify({
        ...planDefaults.premium,
        maxDestinations: 0,
      }),
    });

    await expect(getPlanPolicy("premium")).rejects.toThrow(
      "Invalid stored policy for premium: Invalid maxDestinations",
    );
  });

  test("propagates database errors", async () => {
    const error = new Error("Database unavailable");

    findPlanPolicyByName.mockRejectedValue(error);

    await expect(getPlanPolicy("premium")).rejects.toBe(error);
  });

  test("does not query storage for an unknown plan", async () => {
    await expect(getPlanPolicy("admin")).rejects.toThrow("Unknown plan");

    expect(findPlanPolicyByName).not.toHaveBeenCalled();
  });
});
