const planDefaults = require("../config/planDefaults");
const {
  findPlanPolicyByName,
  updatePlanPolicyByName,
} = require("../models/planPolicyModel");
const PlanPolicyError = require("../utils/planPolicyError");
const getPlanPolicyError = require("../utils/planPolicyValidator");

function assertKnownPlan(plan) {
  if (
    typeof plan !== "string" ||
    !Object.prototype.hasOwnProperty.call(planDefaults, plan)
  ) {
    throw new PlanPolicyError("UNKNOWN_PLAN", "Unknown plan");
  }
}

async function getPlanPolicy(plan) {
  assertKnownPlan(plan);

  const row = await findPlanPolicyByName(plan);

  if (!row) {
    throw new PlanPolicyError("MISSING_POLICY", `Missing policy for ${plan}`);
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

async function updatePlanPolicy(plan, policy) {
  assertKnownPlan(plan);

  const error = getPlanPolicyError(policy);

  if (error) {
    throw new PlanPolicyError(
      "INVALID_POLICY",
      `Invalid policy for ${plan}: ${error}`,
    );
  }

  const policyJson = JSON.stringify(policy);
  const updated = await updatePlanPolicyByName(plan, policyJson);

  if (!updated) {
    throw new PlanPolicyError("MISSING_POLICY", `Missing policy for ${plan}`);
  }

  return JSON.parse(policyJson);
}

module.exports = {
  getPlanPolicy,
  updatePlanPolicy,
};
