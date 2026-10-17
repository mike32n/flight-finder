const { getPlanPolicy } = require("../../services/planPolicyService");

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
});
