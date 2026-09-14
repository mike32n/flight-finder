const { validatePassword } = require("../utils/passwordValidator");

describe("validatePassword", () => {
  test("should accept a valid password", () => {
    expect(validatePassword("Password123")).toBeNull();
  });

  test("should reject missing password", () => {
    expect(validatePassword()).toBe("Password is required.");
  });

  test("should reject password shorter than 8 characters", () => {
    expect(validatePassword("Pass123")).toBe(
      "Password must be at least 8 characters.",
    );
  });

  test("should reject password without uppercase letter", () => {
    expect(validatePassword("password123")).toBe(
      "Password must contain uppercase, lowercase and number.",
    );
  });

  test("should reject password without lowercase letter", () => {
    expect(validatePassword("PASSWORD123")).toBe(
      "Password must contain uppercase, lowercase and number.",
    );
  });

  test("should reject password without number", () => {
    expect(validatePassword("Password")).toBe(
      "Password must contain uppercase, lowercase and number.",
    );
  });
});
