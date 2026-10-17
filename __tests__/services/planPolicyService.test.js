jest.mock("../../models/planPolicyModel", () => ({
  findPlanPolicyByName: jest.fn(),
  updatePlanPolicyByName: jest.fn(),
}));

const {
  getPlanPolicy,
  updatePlanPolicy,
} = require("../../services/planPolicyService");
const planDefaults = require("../../config/planDefaults");
const {
  findPlanPolicyByName,
  updatePlanPolicyByName,
} = require("../../models/planPolicyModel");

beforeEach(() => {
  findPlanPolicyByName.mockReset();

  findPlanPolicyByName.mockImplementation(async (plan) => ({
    plan,
    policy_json: JSON.stringify(planDefaults[plan]),
  }));

  updatePlanPolicyByName.mockReset();
  updatePlanPolicyByName.mockResolvedValue(true);
});

describe("getPlanPolicy", () => {
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

describe("updatePlanPolicy", () => {
  test("saves a valid policy and returns an independent object", async () => {
    const policy = {
      ...planDefaults.registered,
      maxDestinations: 1,
      canSelectStartDate: true,
    };

    const result = await updatePlanPolicy("registered", policy);

    expect(updatePlanPolicyByName).toHaveBeenCalledWith(
      "registered",
      JSON.stringify(policy),
    );

    expect(result).toEqual(policy);
    expect(result).not.toBe(policy);
  });

  test("does not write an invalid policy", async () => {
    const policy = {
      ...planDefaults.registered,
      maxDestinations: 0,
    };

    await expect(updatePlanPolicy("registered", policy)).rejects.toThrow(
      "Invalid policy for registered: Invalid maxDestinations",
    );

    expect(updatePlanPolicyByName).not.toHaveBeenCalled();
  });

  test("does not write an unknown plan", async () => {
    await expect(
      updatePlanPolicy("admin", planDefaults.premium),
    ).rejects.toThrow("Unknown plan");

    expect(updatePlanPolicyByName).not.toHaveBeenCalled();
  });

  test("rejects an update when the stored plan is missing", async () => {
    updatePlanPolicyByName.mockResolvedValue(false);

    await expect(
      updatePlanPolicy("premium", planDefaults.premium),
    ).rejects.toThrow("Missing policy for premium");
  });

  test("propagates write errors", async () => {
    const error = new Error("Database write failed");

    updatePlanPolicyByName.mockRejectedValue(error);

    await expect(
      updatePlanPolicy("premium", planDefaults.premium),
    ).rejects.toBe(error);
  });
});
