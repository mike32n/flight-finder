const {
  shouldRunFlex,
  analyzePriceDelta,
} = require("../services/smartFlexService");

describe("shouldRunFlex", () => {
  test("returns true when no successful results", () => {
    expect(shouldRunFlex([])).toBe(true);
  });

  test("returns false when prices are similar", () => {
    const results = [
      { success: true, data: { price: 100 } },
      { success: true, data: { price: 105 } },
      { success: true, data: { price: 108 } },
    ];

    expect(shouldRunFlex(results)).toBe(false);
  });

  test("returns true when majority is significantly more expensive", () => {
    const results = [
      { success: true, data: { price: 100 } },
      { success: true, data: { price: 200 } },
      { success: true, data: { price: 220 } },
      { success: true, data: { price: 230 } },
    ];

    expect(shouldRunFlex(results)).toBe(true);
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

  test("detects departure shift", () => {
    const base = [
      {
        success: true,
        data: {
          price: 100,
          departure: "2026-06-10",
          return: "2026-06-15",
        },
      },
    ];

    const flex = [
      {
        success: true,
        data: {
          price: 70,
          departure: "2026-06-08",
          return: "2026-06-15",
        },
      },
    ];

    const result = analyzePriceDelta(base, flex);

    expect(result.type).toBe("departure_shift");
    expect(result.diff).toBe(30);
  });

  test("detects return shift", () => {
    const base = [
      {
        success: true,
        data: {
          price: 100,
          departure: "2026-06-10",
          return: "2026-06-15",
        },
      },
    ];

    const flex = [
      {
        success: true,
        data: {
          price: 70,
          departure: "2026-06-10",
          return: "2026-06-18",
        },
      },
    ];

    const result = analyzePriceDelta(base, flex);

    expect(result.type).toBe("return_shift");
  });
});
