const { getSafeBookingUrl } = require("../../public/js/booking-url");

describe("getSafeBookingUrl", () => {
  test.each([
    undefined,
    null,
    123,
    {},
    [],
    "",
    "not a URL",
    "/booking",
    "//example.com/booking",
    "http://example.com/booking",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///tmp/booking.html",
    "https://user:password@example.com/booking",
    "https://user@example.com/booking",
  ])("rejects invalid or unsupported booking URL: %p", (value) => {
    expect(getSafeBookingUrl(value)).toBeNull();
  });

  test("preserves an absolute HTTPS booking URL", () => {
    const url = "https://www.google.com/travel/flights?test";

    expect(getSafeBookingUrl(url)).toBe(url);
  });

  test("normalizes the protocol and hostname", () => {
    expect(
      getSafeBookingUrl("HTTPS://WWW.GOOGLE.COM/travel/flights?test"),
    ).toBe("https://www.google.com/travel/flights?test");
  });
});
