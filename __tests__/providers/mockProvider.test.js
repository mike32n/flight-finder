const MockProvider = require("../../providers/mockProvider");
const { generateMockPrice } = MockProvider;

describe("generateMockPrice", () => {
  test("returns a number within the expected price range", () => {
    const price = generateMockPrice("PAR", "2026-06-01", "2026-06-04");

    expect(typeof price).toBe("number");
    expect(price).toBeGreaterThanOrEqual(20000);
    expect(price).toBeLessThan(80000);
  });

  test("same input gives deterministic result", () => {
    const a = generateMockPrice("PAR", "2026-06-01", "2026-06-04");

    const b = generateMockPrice("PAR", "2026-06-01", "2026-06-04");

    expect(a).toBe(b);
  });

  test("different destinations give different prices", () => {
    const cfu = generateMockPrice("CFU", "2026-06-01", "2026-06-04");

    const lca = generateMockPrice("LCA", "2026-06-01", "2026-06-04");

    const pmi = generateMockPrice("PMI", "2026-06-01", "2026-06-04");

    expect(new Set([cfu, lca, pmi]).size).toBe(3);
  });

  test("different departure dates give different prices", () => {
    const first = generateMockPrice("CFU", "2026-06-01", "2026-06-04");

    const second = generateMockPrice("CFU", "2026-06-08", "2026-06-11");

    expect(first).not.toBe(second);
  });

  test("different return dates give different prices", () => {
    const base = generateMockPrice("CFU", "2026-06-01", "2026-06-04");

    const flex = generateMockPrice("CFU", "2026-06-01", "2026-06-05");

    expect(base).not.toBe(flex);
  });
});

describe("MockProvider", () => {
  let provider;

  beforeEach(() => {
    provider = new MockProvider();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("returns successful flight result", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);

    const result = await provider.searchFlights(
      "PAR",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result).toEqual({
      success: true,
      data: {
        destination: "PAR",
        departure: "2026-06-01",
        return: "2026-06-04",
        price: generateMockPrice("PAR", "2026-06-01", "2026-06-04"),
        currency: "HUF",
        bookingUrl: "https://www.google.com/travel/flights?test",
      },
    });
  });

  test("returns failure result when mock API fails", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1);

    const result = await provider.searchFlights(
      "PAR",
      "2026-06-01",
      "2026-06-04",
    );

    expect(result).toEqual({
      success: false,
      error: "Mock API error",
    });
  });
});
