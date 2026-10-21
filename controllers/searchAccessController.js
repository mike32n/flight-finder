function getSearchAccess(req, res) {
  const { plan, policy } = req.searchAccess;

  return res.json({
    success: true,
    plan,
    policy,
  });
}

module.exports = { getSearchAccess };
