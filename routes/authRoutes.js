const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const validator = require("validator");

const {
  createUser,
  findUserByEmail,
  findUserByVerificationToken,
  verifyUser,
  savePasswordResetToken,
  findUserByPasswordResetToken,
  updatePassword,
} = require("../models/userModel");

const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");

const { validatePassword } = require("../utils/passwordValidator");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { password } = req.body;

    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomUUID();

    await createUser({
      email,
      passwordHash,
      verificationToken,
    });

    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      success: true,
      message: "User created.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const user = await findUserByVerificationToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token.",
      });
    }

    await verifyUser(user.id);

    res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;

    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Login successful.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    const user = await findUserByEmail(email);

    if (user) {
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 3600000); // 1 hour from now

      await savePasswordResetToken(user.id, token, expires);

      await sendPasswordResetEmail(email, token);
    }

    res.status(200).json({
      success: true,
      message:
        "If the email address is registered, a password reset email has been sent.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const passwordError = validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    const user = await findUserByPasswordResetToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token.",
      });
    }

    if (
      !user.password_reset_expires ||
      new Date(user.password_reset_expires) < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await updatePassword(user.id, passwordHash);

    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

module.exports = router;
