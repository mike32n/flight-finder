const planDefaults = require("../config/planDefaults");
const {
  getPlanPolicy,
  updatePlanPolicy,
} = require("../services/planPolicyService");
const PlanPolicyError = require("../utils/planPolicyError");

async function getPlanPolicies(req, res) {
  res.set("Cache-Control", "no-store");

  try {
    const entries = await Promise.all(
      Object.keys(planDefaults).map(async (plan) => [
        plan,
        await getPlanPolicy(plan),
      ]),
    );

    return res.status(200).json({
      success: true,
      policies: Object.fromEntries(entries),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

async function updatePlanPolicyConfiguration(req, res) {
  res.set("Cache-Control", "no-store");

  try {
    const plan = req.params.plan;
    const policy = await updatePlanPolicy(plan, req.body);

    return res.status(200).json({
      success: true,
      plan,
      policy,
    });
  } catch (error) {
    if (error instanceof PlanPolicyError) {
      if (error.code === "INVALID_POLICY") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (error.code === "UNKNOWN_PLAN" || error.code === "MISSING_POLICY") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

module.exports = {
  getPlanPolicies,
  updatePlanPolicyConfiguration,
};
