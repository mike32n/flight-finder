const express = require("express");

const {
  register,
  verifyEmail,
  login,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getCurrentUser,
  updateCurrentUser,
} = require("../controllers/authController");
const { loadUserAccess } = require("../middlewares/loadUserAccess");

const { authenticateToken } = require("../middlewares/authMiddleware");
const { validateAuthBody } = require("../middlewares/validateAuthBody");

const router = express.Router();

router.post("/register", validateAuthBody, register);

router.get("/verify/:token", verifyEmail);

router.post("/login", validateAuthBody, login);

router.post("/forgot-password", validateAuthBody, forgotPassword);

router.get("/reset-password/:token", validateResetToken);

router.post("/reset-password/:token", validateAuthBody, resetPassword);

router.get("/me", authenticateToken, loadUserAccess, getCurrentUser);
router.patch(
  "/me",
  authenticateToken,
  loadUserAccess,
  validateAuthBody,
  updateCurrentUser,
);

module.exports = router;
