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

function updatePlanPolicyByName(plan, policyJson) {
  return new Promise((resolve, reject) => {
    getDb().run(
      `
        UPDATE plan_policies
        SET policy_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE plan = ?
      `,
      [policyJson, plan],
      function (error) {
        if (error) {
          return reject(error);
        }

        resolve(this.changes > 0);
      },
    );
  });
}

module.exports = {
  findPlanPolicyByName,
  updatePlanPolicyByName,
};
