const MockProvider = require("../providers/mockProvider");
const { generateMockPrice } = MockProvider;

describe("generateMockPrice", () => {
  test("returns a number", () => {
    const price = generateMockPrice("Paris", "2026-06-01");
    expect(typeof price).toBe("number");
  });

  test("returns positive price", () => {
    const price = generateMockPrice("Rome", "2026-06-01");
    expect(price).toBeGreaterThan(0);
  });

  test("same input gives deterministic result", () => {
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
        price: generateMockPrice("PAR", "2026-06-01"),
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
