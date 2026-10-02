const {
  shouldRunFallbackFlex,
  analyzePriceDelta,
} = require("../../services/smartFlexService");

describe("shouldRunFallbackFlex", () => {
  test("returns false when base search has a successful result", () => {
    const results = [
      {
        success: true,
        data: {
          destination: "CFU",
          price: 30000,
        },
      },
    ];

    expect(shouldRunFallbackFlex(results)).toBe(false);
  });

  test("returns true when all base searches return no results", () => {
    const results = [
      {
        success: false,
        reason: "no_results",
      },
      {
        success: false,
        reason: "no_results",
      },
    ];

    expect(shouldRunFallbackFlex(results)).toBe(true);
  });

  test("returns false when all base searches fail with provider errors", () => {
    const results = [
      {
        success: false,
        reason: "provider_error",
      },
      {
        success: false,
        reason: "provider_error",
      },
    ];

    expect(shouldRunFallbackFlex(results)).toBe(false);
  });

  test("returns false when no results and provider errors are mixed", () => {
    const results = [
      {
        success: false,
        reason: "no_results",
      },
      {
        success: false,
        reason: "provider_error",
      },
    ];

    expect(shouldRunFallbackFlex(results)).toBe(false);
  });

  test("returns false for empty results", () => {
    expect(shouldRunFallbackFlex([])).toBe(false);
  });
});

describe("analyzePriceDelta", () => {
  test("returns null when no data", () => {
    expect(analyzePriceDelta([], [])).toBeNull();
  });

  test("returns null when flex is not cheaper", () => {
    const base = [
      {
        success: true,
        data: {
          price: 100,
          departure: "2026-06-01",
          return: "2026-06-05",
        },
      },
    ];

    const flex = [
      {
        success: true,
        data: {
          price: 120,
          departure: "2026-06-01",
          return: "2026-06-05",
        },
      },
    ];

    expect(analyzePriceDelta(base, flex)).toBeNull();
  });

  test("matches flex result with its exact base trip", () => {
    const base = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-11",
          price: 30000,
        },
      },
    ];

    const flex = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-12",
          price: 20000,
          baseDeparture: "2026-10-09",
          baseReturn: "2026-10-11",
        },
      },
    ];

    const result = analyzePriceDelta(base, flex);

    expect(result).toEqual({
      destination: "CFU",
      percent: 33,
      diff: 10000,
      reason: "return later",
      type: "return_shift",
      basePrice: 30000,
      flexPrice: 20000,
    });
  });

  test("does not match flex result with a different destination", () => {
    const base = [
      {
        success: true,
        data: {
          destination: "LCA",
          departure: "2026-10-09",
          return: "2026-10-11",
          price: 30000,
        },
      },
    ];

    const flex = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-12",
          price: 20000,
          baseDeparture: "2026-10-09",
          baseReturn: "2026-10-11",
        },
      },
    ];

    const result = analyzePriceDelta(base, flex);

    expect(result).toBeNull();
  });

  test("does not match flex result with a different base trip", () => {
    const base = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-11",
          price: 30000,
        },
      },
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-16",
          return: "2026-10-18",
          price: 40000,
        },
      },
    ];

    const flex = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-23",
          return: "2026-10-26",
          price: 20000,
          baseDeparture: "2026-10-23",
          baseReturn: "2026-10-25",
        },
      },
    ];

    const result = analyzePriceDelta(base, flex);

    expect(result).toBeNull();
  });

  test("returns price insight when matching flex result is cheaper", () => {
    const base = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-11",
          price: 40000,
        },
      },
    ];

    const flex = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-12",
          price: 30000,
          baseDeparture: "2026-10-09",
          baseReturn: "2026-10-11",
        },
      },
    ];

    const result = analyzePriceDelta(base, flex);

    expect(result).not.toBeNull();
    expect(result.diff).toBe(10000);
    expect(result.percent).toBe(25);
    expect(result.basePrice).toBe(40000);
    expect(result.flexPrice).toBe(30000);
  });

  test("returns null when matching flex results are not cheaper", () => {
    const base = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-11",
          price: 30000,
        },
      },
    ];

    const flex = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-12",
          price: 30000,
          baseDeparture: "2026-10-09",
          baseReturn: "2026-10-11",
        },
      },
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-08",
          return: "2026-10-11",
          price: 35000,
          baseDeparture: "2026-10-09",
          baseReturn: "2026-10-11",
        },
      },
    ];

    const result = analyzePriceDelta(base, flex);

    expect(result).toBeNull();
  });

  test("returns the flex result with the largest absolute saving", () => {
    const base = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-11",
          price: 40000,
        },
      },
      {
        success: true,
        data: {
          destination: "LCA",
          departure: "2026-10-09",
          return: "2026-10-11",
          price: 60000,
        },
      },
    ];

    const flex = [
      {
        success: true,
        data: {
          destination: "CFU",
          departure: "2026-10-09",
          return: "2026-10-12",
          price: 30000,
          baseDeparture: "2026-10-09",
          baseReturn: "2026-10-11",
        },
      },
      {
        success: true,
        data: {
          destination: "LCA",
          departure: "2026-10-09",
          return: "2026-10-12",
          price: 35000,
          baseDeparture: "2026-10-09",
          baseReturn: "2026-10-11",
        },
      },
    ];

    const result = analyzePriceDelta(base, flex);

    expect(result).toEqual(
      expect.objectContaining({
        destination: "LCA",
        diff: 25000,
        basePrice: 60000,
        flexPrice: 35000,
      }),
    );
  });

  test.each([
    {
      name: "departure earlier",
      departure: "2026-10-08",
      returnDate: "2026-10-11",
      expectedReason: "leave earlier",
      expectedType: "departure_shift",
    },
    {
      name: "departure later",
      departure: "2026-10-10",
      returnDate: "2026-10-11",
      expectedReason: "leave later",
      expectedType: "departure_shift",
    },
    {
      name: "return earlier",
      departure: "2026-10-09",
      returnDate: "2026-10-10",
      expectedReason: "return earlier",
      expectedType: "return_shift",
    },
    {
      name: "return later",
      departure: "2026-10-09",
      returnDate: "2026-10-12",
      expectedReason: "return later",
      expectedType: "return_shift",
    },
  ])(
    "detects $name",
    ({ departure, returnDate, expectedReason, expectedType }) => {
      const base = [
        {
          success: true,
          data: {
            destination: "CFU",
            departure: "2026-10-09",
            return: "2026-10-11",
            price: 30000,
          },
        },
      ];

      const flex = [
        {
          success: true,
          data: {
            destination: "CFU",
            departure,
            return: returnDate,
            price: 20000,
            baseDeparture: "2026-10-09",
            baseReturn: "2026-10-11",
          },
        },
      ];

      const result = analyzePriceDelta(base, flex);

      expect(result).not.toBeNull();
      expect(result.reason).toBe(expectedReason);
      expect(result.type).toBe(expectedType);
    },
  );
});
