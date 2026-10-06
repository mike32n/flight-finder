const {
  shouldRunFallbackFlex,
  analyzeFlexResult,
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

describe("analyzeFlexResult", () => {
  const baseResults = [
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
        price: 50000,
      },
    },
  ];

  test("returns price insight for cheaper flex result", () => {
    const flexResult = {
      success: true,
      data: {
        destination: "CFU",
        departure: "2026-10-09",
        return: "2026-10-12",
        price: 20000,
        baseDeparture: "2026-10-09",
        baseReturn: "2026-10-11",
      },
    };

    expect(analyzeFlexResult(baseResults, flexResult)).toEqual({
      percent: 33,
      diff: 10000,
      reason: "return later",
      type: "return_shift",
      basePrice: 30000,
      flexPrice: 20000,
    });
  });

  test("matches flex result with its exact base trip", () => {
    const flexResult = {
      success: true,
      data: {
        destination: "CFU",
        departure: "2026-10-16",
        return: "2026-10-19",
        price: 35000,
        baseDeparture: "2026-10-16",
        baseReturn: "2026-10-18",
      },
    };

    const result = analyzeFlexResult(baseResults, flexResult);

    expect(result.basePrice).toBe(50000);
    expect(result.flexPrice).toBe(35000);
    expect(result.diff).toBe(15000);
    expect(result.percent).toBe(30);
  });

  test("detects earlier departure", () => {
    const flexResult = {
      success: true,
      data: {
        destination: "CFU",
        departure: "2026-10-08",
        return: "2026-10-11",
        price: 20000,
        baseDeparture: "2026-10-09",
        baseReturn: "2026-10-11",
      },
    };

    const result = analyzeFlexResult(baseResults, flexResult);

    expect(result.reason).toBe("leave earlier");
    expect(result.type).toBe("departure_shift");
  });

  test("returns null when flex result is not cheaper", () => {
    const flexResult = {
      success: true,
      data: {
        destination: "CFU",
        departure: "2026-10-09",
        return: "2026-10-12",
        price: 35000,
        baseDeparture: "2026-10-09",
        baseReturn: "2026-10-11",
      },
    };

    expect(analyzeFlexResult(baseResults, flexResult)).toBeNull();
  });

  test("returns null when matching base trip does not exist", () => {
    const flexResult = {
      success: true,
      data: {
        destination: "CFU",
        departure: "2026-10-23",
        return: "2026-10-26",
        price: 20000,
        baseDeparture: "2026-10-23",
        baseReturn: "2026-10-25",
      },
    };

    expect(analyzeFlexResult(baseResults, flexResult)).toBeNull();
  });

  test("returns null for failed flex result", () => {
    expect(
      analyzeFlexResult(baseResults, {
        success: false,
        reason: "no_results",
      }),
    ).toBeNull();
  });
});
