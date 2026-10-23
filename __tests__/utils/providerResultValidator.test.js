const {
  normalizeProviderResult,
} = require("../../utils/providerResultValidator");

function createResult(overrides = {}) {
  return {
    success: true,
    data: {
      destination: "AMS",
      departure: "2027-03-06",
      return: "2027-03-08",
      price: 30000,
      currency: "HUF",
      bookingUrl: "https://www.google.com/travel/flights?test",
      ...overrides,
    },
  };
}

const invalidResponse = {
  success: false,
  reason: "provider_error",
  error: "Invalid provider response",
};

describe("normalizeProviderResult", () => {
  test("preserves a valid result and Flex metadata", () => {
    const result = createResult({
      baseDeparture: "2027-03-06",
      baseReturn: "2027-03-08",
    });

    expect(normalizeProviderResult(result)).toEqual(result);
  });

  test("accepts decimal prices and a missing optional booking URL", () => {
    const result = createResult({
      price: 123.45,
      currency: "EUR",
    });

    delete result.data.bookingUrl;

    expect(normalizeProviderResult(result)).toEqual(result);
  });

  test("accepts past calendar dates without applying search-input rules", () => {
    const result = createResult({
      departure: "2000-02-29",
      return: "2000-03-01",
    });

    expect(normalizeProviderResult(result)).toEqual(result);
  });

  test.each(
    [
      undefined,
      null,
      [],
      {},
      { success: "true" },
      { success: true },
      { success: true, data: null },
      { success: true, data: [] },
    ].map((result) => [result]),
  )("converts malformed envelopes into provider errors: %p", (result) => {
    expect(normalizeProviderResult(result)).toEqual(invalidResponse);
  });

  test.each([
    { destination: "XXX" },
    { destination: null },
    { departure: "2027-02-29" },
    { departure: "2027-3-06" },
    { departure: "2027-03-06\n" },
    { return: "2027-03-06" },
    { return: "2027-03-05" },
    { return: "2027-13-01" },
    { price: 0 },
    { price: -1 },
    { price: NaN },
    { price: Infinity },
    { price: "30000" },
    { currency: undefined },
    { currency: "huf" },
    { currency: "HUF\n" },
    { currency: 123 },
    { bookingUrl: null },
    { bookingUrl: "" },
    { bookingUrl: "javascript:alert(1)" },
    { bookingUrl: "http://example.com" },
    { bookingUrl: "https://user:password@example.com" },
  ])("converts invalid flight data into provider errors: %p", (overrides) => {
    expect(normalizeProviderResult(createResult(overrides))).toEqual(
      invalidResponse,
    );
  });

  test("preserves no-results outcomes", () => {
    expect(
      normalizeProviderResult({
        success: false,
        reason: "no_results",
      }),
    ).toEqual({
      success: false,
      reason: "no_results",
    });
  });

  test("preserves a provider error message", () => {
    const result = {
      success: false,
      reason: "provider_error",
      error: "Unavailable",
    };

    expect(normalizeProviderResult(result)).toEqual(result);
  });

  test("converts an unknown failure reason into a provider error", () => {
    expect(
      normalizeProviderResult({
        success: false,
        reason: "unexpected",
      }),
    ).toEqual(invalidResponse);
  });
});
