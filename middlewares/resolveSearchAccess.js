const { authenticateToken } = require("./authMiddleware");
const { loadUserAccess } = require("./loadUserAccess");
const { getPlanPolicy } = require("../services/planPolicyService");

async function attachSearchPolicy(plan, req, res, next) {
  try {
    const policy = await getPlanPolicy(plan);

    req.searchAccess = {
      plan,
      policy,
    };
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }

  next();
}

function resolveSearchAccess(req, res, next) {
  if (req.headers.authorization === undefined) {
    return attachSearchPolicy("anonymous", req, res, next);
  }

  return authenticateToken(req, res, () =>
    loadUserAccess(req, res, () =>
      attachSearchPolicy(req.currentUser.plan, req, res, next),
    ),
  );
}

module.exports = {
  resolveSearchAccess,
};
