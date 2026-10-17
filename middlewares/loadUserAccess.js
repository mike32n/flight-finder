const { findUserById } = require("../models/userModel");

async function loadUserAccess(req, res, next) {
  const userId = req.user?.userId;

  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }

  try {
    const user = await findUserById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    req.currentUser = {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified === 1,
      plan: user.plan,
      isAdmin: user.is_admin === 1,
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

module.exports = {
  loadUserAccess,
};
