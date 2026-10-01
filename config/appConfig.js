module.exports = {
  destinations: {
    maxSelected: 3,
  },
  search: {
    weeksToGenerate: 8,
    maxNights: 30,
    maxResults: 5,
  },
  smartFlex: {
    enabled: true,
    departureShiftDays: 1,
    returnShiftDays: 1,
  },
  cache: {
    ttlSeconds: 3600,
  },
  api: {
    timeoutMs: 15000,
  },
  auth: {
    emailVerificationRequired:
      process.env.EMAIL_VERIFICATION_REQUIRED !== "false",
    passwordResetTokenLifetimeMs: 60 * 60 * 1000,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
    bcryptSaltRounds: 10,
  },
};
