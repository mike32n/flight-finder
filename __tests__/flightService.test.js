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

  test("same input gives deterministic result (optional)", () => {
    const a = generateMockPrice("Paris", "2026-06-01");
    const b = generateMockPrice("Paris", "2026-06-01");

    expect(a).toBe(b);
  });

  test("different destinations give different prices", () => {
    const paris = generateMockPrice("Paris", "2026-06-01");
    const rome = generateMockPrice("Rome", "2026-06-01");

    expect(paris).not.toBe(rome);
  });
});
