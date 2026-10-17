const planDefaults = require("../config/planDefaults");
const { getPlanPolicy } = require("../services/planPolicyService");

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

module.exports = {
  getPlanPolicies,
};
