const {
  hasValidPasswordResetToken,
} = require("../../utils/passwordResetTokenValidator");

describe("hasValidPasswordResetToken", () => {
  test("returns false when user does not exist", () => {
    expect(hasValidPasswordResetToken(null)).toBe(false);
  });

  test("returns false when expiration is missing", () => {
    const user = {
      password_reset_expires: null,
    };

    expect(hasValidPasswordResetToken(user)).toBe(false);
  });

  test("returns false when token has expired", () => {
    const user = {
      password_reset_expires: new Date(Date.now() - 60_000),
    };

    expect(hasValidPasswordResetToken(user)).toBe(false);
  });

  test("returns true when token has not expired", () => {
    const user = {
      password_reset_expires: new Date(Date.now() + 60_000),
    };

    expect(hasValidPasswordResetToken(user)).toBe(true);
  });
});
