const planDefaults = require("../config/planDefaults");
const getPlanPolicyError = require("../utils/planPolicyValidator");

function run(db, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parameters, (error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
}

async function initializePlanPolicies(db) {
  const entries = Object.entries(planDefaults);

  for (const [plan, policy] of entries) {
    const error = getPlanPolicyError(policy);

    if (error) {
      throw new Error(`Invalid default policy for ${plan}: ${error}`);
    }
  }

  await run(
    db,
    `
      CREATE TABLE IF NOT EXISTS plan_policies (
        plan TEXT PRIMARY KEY NOT NULL
          CHECK (plan IN ('anonymous', 'registered', 'premium')),
        policy_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
  );

  for (const [plan, policy] of entries) {
    await run(
      db,
      `
        INSERT INTO plan_policies (plan, policy_json)
        VALUES (?, ?)
        ON CONFLICT(plan) DO NOTHING
      `,
      [plan, JSON.stringify(policy)],
    );
  }
}

module.exports = initializePlanPolicies;
