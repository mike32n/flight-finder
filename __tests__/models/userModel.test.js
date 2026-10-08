process.env.DB_PATH = ":memory:";

const { initDb, closeDb } = require("../../db");

const {
  createUser,
  findUserByEmail,
  findUserByVerificationToken,
  verifyUser,
  savePasswordResetToken,
  findUserByPasswordResetToken,
  updatePassword,
} = require("../../models/userModel");

describe("userModel", () => {
  beforeAll(async () => {
    await initDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  test("should create and find user by email", async () => {
    const result = await createUser({
      email: "user@example.com",
      passwordHash: "hashed-password",
      verificationToken: "verification-token",
    });

    expect(result.id).toEqual(expect.any(Number));

    const user = await findUserByEmail("user@example.com");

    expect(user).toEqual(
      expect.objectContaining({
        id: result.id,
        email: "user@example.com",
        password_hash: "hashed-password",
        email_verified: 0,
        verification_token: "verification-token",
      }),
    );
  });

  test("should return null when email does not exist", async () => {
    const user = await findUserByEmail("missing@example.com");

    expect(user).toBeNull();
  });

  test("should create user as verified when emailVerified is true", async () => {
    await createUser({
      email: "verified@example.com",
      passwordHash: "hashed-password",
      verificationToken: null,
      emailVerified: true,
    });

    const user = await findUserByEmail("verified@example.com");

    expect(user.email_verified).toBe(1);
    expect(user.verification_token).toBeNull();
  });

  test("should find user by verification token", async () => {
    await createUser({
      email: "verification@example.com",
      passwordHash: "hashed-password",
      verificationToken: "find-verification-token",
    });

    const user = await findUserByVerificationToken("find-verification-token");

    expect(user.email).toBe("verification@example.com");
  });

  test("should return null when verification token does not exist", async () => {
    const user = await findUserByVerificationToken("missing-token");

    expect(user).toBeNull();
  });

  test("should verify user and clear verification token", async () => {
    const created = await createUser({
      email: "verify@example.com",
      passwordHash: "hashed-password",
      verificationToken: "verify-token",
    });

    await verifyUser(created.id);

    const user = await findUserByEmail("verify@example.com");

    expect(user.email_verified).toBe(1);
    expect(user.verification_token).toBeNull();
  });

  test("should save and find password reset token", async () => {
    const created = await createUser({
      email: "reset@example.com",
      passwordHash: "old-hash",
      verificationToken: null,
    });

    const expires = new Date(Date.now() + 60_000);

    await savePasswordResetToken(created.id, "password-reset-token", expires);

    const user = await findUserByPasswordResetToken("password-reset-token");

    expect(user).not.toBeNull();
    expect(user.id).toBe(created.id);
    expect(user.password_reset_token).toBe("password-reset-token");
    expect(user.password_reset_expires).not.toBeNull();
  });

  test("should return null when password reset token does not exist", async () => {
    const user = await findUserByPasswordResetToken("missing-reset-token");

    expect(user).toBeNull();
  });

  test("should update password and clear password reset data", async () => {
    const created = await createUser({
      email: "password@example.com",
      passwordHash: "old-hash",
      verificationToken: null,
    });

    await savePasswordResetToken(
      created.id,
      "reset-token",
      new Date(Date.now() + 60_000),
    );

    const updated = await updatePassword(created.id, "new-hash", "reset-token");

    expect(updated).toBe(true);

    const user = await findUserByEmail("password@example.com");

    expect(user.password_hash).toBe("new-hash");
    expect(user.password_reset_token).toBeNull();
    expect(user.password_reset_expires).toBeNull();
  });

  test("should allow only one concurrent password update per reset token", async () => {
    const created = await createUser({
      email: "concurrent-reset@example.com",
      passwordHash: "old-hash",
      verificationToken: null,
    });

    await savePasswordResetToken(
      created.id,
      "concurrent-token",
      new Date(Date.now() + 60_000),
    );

    const hashes = ["first-hash", "second-hash"];

    const results = await Promise.all(
      hashes.map((hash) =>
        updatePassword(created.id, hash, "concurrent-token"),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((updated) => !updated)).toHaveLength(1);

    const user = await findUserByEmail("concurrent-reset@example.com");

    expect(user.password_hash).toBe(hashes[results.indexOf(true)]);
    expect(user.password_reset_token).toBeNull();
    expect(user.password_reset_expires).toBeNull();
  });

  test.each([
    {
      name: "expired",
      suppliedToken: "stored-token",
      expiresInMs: -60_000,
    },
    {
      name: "incorrect",
      suppliedToken: "wrong-token",
      expiresInMs: 60_000,
    },
  ])(
    "should reject $name reset token at password update",
    async ({ name, suppliedToken, expiresInMs }) => {
      const email = `reset-${name}@example.com`;

      const created = await createUser({
        email,
        passwordHash: "old-hash",
        verificationToken: null,
      });

      await savePasswordResetToken(
        created.id,
        "stored-token",
        new Date(Date.now() + expiresInMs),
      );

      const updated = await updatePassword(
        created.id,
        "new-hash",
        suppliedToken,
      );

      expect(updated).toBe(false);

      const user = await findUserByEmail(email);

      expect(user.password_hash).toBe("old-hash");
      expect(user.password_reset_token).toBe("stored-token");
    },
  );
});
