process.env.DB_PATH = ":memory:";

const { getDb, initDb, closeDb } = require("../../db");
const { createUser, findUserByEmail } = require("../../models/userModel");
const { grantAdmin } = require("../../scripts/grant-admin");

function runSql(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, parameters, (error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
}

describe("grantAdmin", () => {
  beforeEach(async () => {
    await initDb();
  });

  afterEach(async () => {
    await closeDb();
  });

  test("grants admin access to an existing verified account", async () => {
    await createUser({
      email: "admin@example.com",
      passwordHash: "test-hash",
      verificationToken: null,
      emailVerified: true,
    });

    const email = await grantAdmin(" ADMIN@EXAMPLE.COM ");

    const user = await findUserByEmail("admin@example.com");

    expect(email).toBe("admin@example.com");
    expect(user.is_admin).toBe(1);
    expect(user.plan).toBe("registered");
    expect(user.email_verified).toBe(1);
  });

  test("preserves the account plan", async () => {
    await createUser({
      email: "premium@example.com",
      passwordHash: "test-hash",
      verificationToken: null,
      emailVerified: true,
    });

    await runSql("UPDATE users SET plan = ? WHERE email = ?", [
      "premium",
      "premium@example.com",
    ]);

    await grantAdmin("premium@example.com");

    const user = await findUserByEmail("premium@example.com");

    expect(user.plan).toBe("premium");
    expect(user.is_admin).toBe(1);
  });

  test("does not grant access to an unverified account", async () => {
    await createUser({
      email: "unverified@example.com",
      passwordHash: "test-hash",
      verificationToken: "verification-token",
    });

    await expect(grantAdmin("unverified@example.com")).rejects.toThrow(
      "Verified user not found.",
    );

    const user = await findUserByEmail("unverified@example.com");

    expect(user.is_admin).toBe(0);
    expect(user.email_verified).toBe(0);
  });

  test("does not create a missing account", async () => {
    await expect(grantAdmin("missing@example.com")).rejects.toThrow(
      "Verified user not found.",
    );

    expect(await findUserByEmail("missing@example.com")).toBeNull();
  });

  test("can be repeated for an existing admin", async () => {
    const created = await createUser({
      email: "repeat@example.com",
      passwordHash: "test-hash",
      verificationToken: null,
      emailVerified: true,
    });

    await grantAdmin("repeat@example.com");
    await grantAdmin("repeat@example.com");

    const user = await findUserByEmail("repeat@example.com");

    expect(user.id).toBe(created.id);
    expect(user.is_admin).toBe(1);
    expect(user.plan).toBe("registered");
  });

  test.each(
    [undefined, null, "", "invalid-email", 123, {}].map((email) => [email]),
  )("rejects an invalid email: %p", async (email) => {
    await expect(grantAdmin(email)).rejects.toThrow(
      "A valid email address is required.",
    );
  });
});
