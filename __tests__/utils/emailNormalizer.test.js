const { normalizeEmail } = require("../../utils/emailNormalizer");

describe("normalizeEmail", () => {
  test("trims and lowercases email", () => {
    expect(normalizeEmail("  TEST@EXAMPLE.COM  ")).toBe("test@example.com");
  });

  test("returns undefined when email is undefined", () => {
    expect(normalizeEmail(undefined)).toBeUndefined();
  });
});
