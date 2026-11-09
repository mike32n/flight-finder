const {
  applySearchPolicy,
  getSearchPolicyError,
} = require("../utils/searchPolicy");

function applySearchAccess(req, res, next) {
  const { plan, policy } = req.searchAccess;
  const parameters = applySearchPolicy(req.body, policy);

  const error = getSearchPolicyError(parameters, policy);

  if (error) {
    return res.status(400).json({ error });
  }

  const isGuest = plan === "anonymous" && !req.user && !req.currentUser;

  if (!isGuest) {
    const user = req.currentUser;

    if (
      !user ||
      !Number.isSafeInteger(user.id) ||
      user.id < 1 ||
      plan === "anonymous" ||
      user.plan !== plan ||
      typeof user.smartFlexPreference !== "boolean"
    ) {
      console.error("Invalid authenticated search access context.");

      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }

    parameters.allowFlexSearch =
      policy.smartFlexEnabled === true && user.smartFlexPreference === true;
  }

  req.searchParameters = parameters;
  next();
}

module.exports = { applySearchAccess };
