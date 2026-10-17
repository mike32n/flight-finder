function requireAdmin(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (req.currentUser.isAdmin !== true) {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  next();
}

module.exports = {
  requireAdmin,
};
