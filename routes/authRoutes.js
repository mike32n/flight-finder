const express = require("express");

const {
  register,
  verifyEmail,
  login,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getCurrentUser,
} = require("../controllers/authController");

const { authenticateToken } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);

router.get("/verify/:token", verifyEmail);

router.post("/login", login);

router.post("/forgot-password", forgotPassword);

router.get("/reset-password/:token", validateResetToken);

router.post("/reset-password/:token", resetPassword);

router.get("/me", authenticateToken, getCurrentUser);

module.exports = router;
