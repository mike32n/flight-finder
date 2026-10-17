const planDefaults = require("../config/planDefaults");
const { findPlanPolicyByName } = require("../models/planPolicyModel");
const getPlanPolicyError = require("../utils/planPolicyValidator");

async function getPlanPolicy(plan) {
  if (
    typeof plan !== "string" ||
    !Object.prototype.hasOwnProperty.call(planDefaults, plan)
  ) {
    throw new Error("Unknown plan");
  }

  const row = await findPlanPolicyByName(plan);

  if (!row) {
    throw new Error(`Missing policy for ${plan}`);
  }

  let policy;

  try {
    policy = JSON.parse(row.policy_json);
  } catch {
    throw new Error(`Invalid stored policy for ${plan}: invalid JSON`);
  }

  const error = getPlanPolicyError(policy);

  if (error) {
    throw new Error(`Invalid stored policy for ${plan}: ${error}`);
  }

  return policy;
}

module.exports = {
  getPlanPolicy,
};
