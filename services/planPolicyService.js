const planDefaults = require("../config/planDefaults");

async function getPlanPolicy(plan) {
  if (
    typeof plan !== "string" ||
    !Object.prototype.hasOwnProperty.call(planDefaults, plan)
  ) {
    throw new Error("Unknown plan");
  }

  return {
    ...planDefaults[plan],
  };
}

module.exports = {
  getPlanPolicy,
};
