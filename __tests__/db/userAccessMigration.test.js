process.env.DB_PATH = ":memory:";

const { getDb, initDb, closeDb } = require("../../db");
const { createUser, findUserByEmail } = require("../../models/userModel");

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

describe("user access migration", () => {
  beforeEach(async () => {
    await runSql(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email_verified INTEGER NOT NULL DEFAULT 0,
        verification_token TEXT,
        password_reset_token TEXT,
        password_reset_expires DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runSql(
      `
        INSERT INTO users (email, password_hash, email_verified)
        VALUES (?, ?, ?)
      `,
      ["existing@example.com", "existing-hash", 1],
    );
  });

  afterEach(async () => {
    await closeDb();
  });

  test("migrates existing users without changing their account data", async () => {
    await initDb();

    const user = await findUserByEmail("existing@example.com");

    expect(user).toEqual(
      expect.objectContaining({
        email: "existing@example.com",
        password_hash: "existing-hash",
        email_verified: 1,
        plan: "registered",
        is_admin: 0,
      }),
    );
  });

  test("creates new users with default access despite extra input fields", async () => {
    await initDb();

    await createUser({
      email: "new@example.com",
      passwordHash: "new-hash",
      verificationToken: null,
      plan: "premium",
      isAdmin: true,
      is_admin: 1,
    });

    const user = await findUserByEmail("new@example.com");

    expect(user.plan).toBe("registered");
    expect(user.is_admin).toBe(0);
  });

  test("stores plan and admin status independently", async () => {
    await initDb();

    await runSql(
      `
        UPDATE users
        SET plan = ?, is_admin = ?
        WHERE email = ?
      `,
      ["premium", 0, "existing@example.com"],
    );

    const premiumUser = await findUserByEmail("existing@example.com");

    expect(premiumUser.plan).toBe("premium");
    expect(premiumUser.is_admin).toBe(0);

    await runSql(
      `
        UPDATE users
        SET plan = ?, is_admin = ?
        WHERE email = ?
      `,
      ["registered", 1, "existing@example.com"],
    );

    const adminUser = await findUserByEmail("existing@example.com");

    expect(adminUser.plan).toBe("registered");
    expect(adminUser.is_admin).toBe(1);
  });

  test("preserves assigned access when initialized again", async () => {
    await initDb();

    await runSql(
      `
        UPDATE users
        SET plan = ?, is_admin = ?
        WHERE email = ?
      `,
      ["premium", 1, "existing@example.com"],
    );

    await initDb();

    const user = await findUserByEmail("existing@example.com");

    expect(user.plan).toBe("premium");
    expect(user.is_admin).toBe(1);
  });

  test("completes a migration when only the plan column exists", async () => {
    await runSql(`
      ALTER TABLE users
      ADD COLUMN plan TEXT NOT NULL DEFAULT 'registered'
        CHECK (plan IN ('registered', 'premium'))
    `);

    await runSql("UPDATE users SET plan = ? WHERE email = ?", [
      "premium",
      "existing@example.com",
    ]);

    await initDb();

    const user = await findUserByEmail("existing@example.com");

    expect(user.plan).toBe("premium");
    expect(user.is_admin).toBe(0);
  });

  test.each(["anonymous", "admin", "unknown"])(
    "rejects an unsupported account plan: %s",
    async (plan) => {
      await initDb();

      await expect(
        runSql("UPDATE users SET plan = ? WHERE email = ?", [
          plan,
          "existing@example.com",
        ]),
      ).rejects.toThrow(/CHECK constraint failed/);
    },
  );

  test.each([-1, 2, "true"])(
    "rejects an invalid admin value: %p",
    async (isAdmin) => {
      await initDb();

      await expect(
        runSql("UPDATE users SET is_admin = ? WHERE email = ?", [
          isAdmin,
          "existing@example.com",
        ]),
      ).rejects.toThrow(/CHECK constraint failed/);
    },
  );
});
