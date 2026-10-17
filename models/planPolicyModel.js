const { getDb } = require("../db");

function findPlanPolicyByName(plan) {
  return new Promise((resolve, reject) => {
    getDb().get(
      `
        SELECT plan, policy_json, updated_at
        FROM plan_policies
        WHERE plan = ?
      `,
      [plan],
      (error, row) => {
        if (error) {
          return reject(error);
        }

        resolve(row || null);
      },
    );
  });
}

module.exports = {
  findPlanPolicyByName,
};
