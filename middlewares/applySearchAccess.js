const {
  applySearchPolicy,
  getSearchPolicyError,
} = require("../utils/searchPolicy");

function applySearchAccess(req, res, next) {
  const { policy } = req.searchAccess;
  const parameters = applySearchPolicy(req.body, policy);

  const error = getSearchPolicyError(parameters, policy);

  if (error) {
    return res.status(400).json({ error });
  }

  req.searchParameters = parameters;
  next();
}

module.exports = { applySearchAccess };
