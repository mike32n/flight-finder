process.env.DB_PATH = ":memory:";

const { getDb, initDb, closeDb } = require("../../db");
const planDefaults = require("../../config/planDefaults");

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

function readPolicies() {
  return new Promise((resolve, reject) => {
    getDb().all(
      "SELECT * FROM plan_policies ORDER BY plan",
      [],
      (error, rows) => {
        if (error) {
          return reject(error);
        }

        resolve(rows);
      },
    );
  });
}

describe("plan policy initialization", () => {
  beforeEach(async () => {
    await initDb();
  });

  afterEach(async () => {
    await closeDb();
  });

  test("creates all three plans with their default policies", async () => {
    const rows = await readPolicies();

    expect(rows.map((row) => row.plan)).toEqual([
      "anonymous",
      "premium",
      "registered",
    ]);

    for (const row of rows) {
      expect(JSON.parse(row.policy_json)).toEqual(planDefaults[row.plan]);

      expect(row.updated_at).toEqual(expect.any(String));
    }
  });

  test("does not create duplicates when initialized again", async () => {
    await initDb();

    const rows = await readPolicies();

    expect(rows).toHaveLength(3);
  });

  test("preserves an existing customized policy and timestamp", async () => {
    const customPolicy = {
      ...planDefaults.registered,
      maxDestinations: 1,
      canSelectOrigin: false,
    };

    const updatedAt = "2026-01-01 12:00:00";

    await runSql(
      `
        UPDATE plan_policies
        SET policy_json = ?, updated_at = ?
        WHERE plan = ?
      `,
      [JSON.stringify(customPolicy), updatedAt, "registered"],
    );

    await initDb();

    const rows = await readPolicies();
    const registered = rows.find((row) => row.plan === "registered");

    expect(JSON.parse(registered.policy_json)).toEqual(customPolicy);
    expect(registered.updated_at).toBe(updatedAt);
  });

  test("restores a missing plan without overwriting existing policies", async () => {
    const customPolicy = {
      ...planDefaults.registered,
      adsEnabled: false,
    };

    await runSql(
      `
        UPDATE plan_policies
        SET policy_json = ?
        WHERE plan = ?
      `,
      [JSON.stringify(customPolicy), "registered"],
    );

    await runSql("DELETE FROM plan_policies WHERE plan = ?", ["premium"]);

    await initDb();

    const rows = await readPolicies();

    const premium = rows.find((row) => row.plan === "premium");

    const registered = rows.find((row) => row.plan === "registered");

    expect(rows).toHaveLength(3);
    expect(JSON.parse(premium.policy_json)).toEqual(planDefaults.premium);
    expect(JSON.parse(registered.policy_json)).toEqual(customPolicy);
  });
});
