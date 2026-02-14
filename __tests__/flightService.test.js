const { generateMockPrice } = require("../flightService");

describe("generateMockPrice", () => {
  test("returns a number", () => {
    const price = generateMockPrice("Paris", "2026-06-01");
    expect(typeof price).toBe("number");
  });

  test("returns positive price", () => {
    const price = generateMockPrice("Rome", "2026-06-01");
    expect(price).toBeGreaterThan(0);
  });
});
