process.env.DB_PATH = ":memory:";

const { getDb, initDb, closeDb } = require("../../db");
const { findPlanPolicyByName } = require("../../models/planPolicyModel");
const { getPlanPolicy } = require("../../services/planPolicyService");
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

describe("planPolicyModel", () => {
  beforeEach(async () => {
    await initDb();
  });

  afterEach(async () => {
    await closeDb();
  });

  test.each(["anonymous", "registered", "premium"])(
    "finds the stored policy for %s",
    async (plan) => {
      const row = await findPlanPolicyByName(plan);

      expect(row.plan).toBe(plan);
      expect(JSON.parse(row.policy_json)).toEqual(planDefaults[plan]);
      expect(row.updated_at).toEqual(expect.any(String));
    },
  );

  test("returns null when the policy does not exist", async () => {
    await runSql("DELETE FROM plan_policies WHERE plan = ?", ["premium"]);

    expect(await findPlanPolicyByName("premium")).toBeNull();
  });

  test("the service reads policy changes without restarting", async () => {
    const original = await getPlanPolicy("registered");

    const customPolicy = {
      ...original,
      maxDestinations: 1,
      canSelectStartDate: true,
    };

    await runSql(
      `
        UPDATE plan_policies
        SET policy_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE plan = ?
      `,
      [JSON.stringify(customPolicy), "registered"],
    );

    const updated = await getPlanPolicy("registered");

    expect(updated).toEqual(customPolicy);
    expect(original).toEqual(planDefaults.registered);
  });
});
