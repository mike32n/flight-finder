const crypto = require("crypto");
const bcrypt = require("bcrypt");
const validator = require("validator");
const jwt = require("jsonwebtoken");

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
  sendPasswordResetSuccessEmail,
} = require("../services/emailService");

const { validatePassword } = require("../utils/passwordValidator");
const { auth } = require("../config/appConfig");

const {
  hasValidPasswordResetToken,
} = require("../utils/passwordResetTokenValidator");

const { validateEmailType } = require("../utils/emailValidator");
const { normalizeEmail } = require("../utils/emailNormalizer");

async function sendRegistrationVerification(
  email,
  token,
  res,
  successStatus,
  successMessage,
) {
  try {
    await sendVerificationEmail(email, token);
  } catch (error) {
    console.error("Failed to send verification email:", error.message);

    return res.status(503).json({
      success: false,
      message:
        "Your account is awaiting email verification, but the email could not be sent. Please retry registration with the same email and password.",
    });
  }

  return res.status(successStatus).json({
    success: true,
    message: successMessage,
  });
}

async function register(req, res) {
  try {
    const { password } = req.body;

    const emailError = validateEmailType(req.body.email);

    if (emailError) {
      return res.status(400).json({
        success: false,
        message: emailError,
      });
    }

    const email = normalizeEmail(req.body.email);

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
      if (
        auth.emailVerificationRequired &&
        existingUser.email_verified === 0 &&
        existingUser.verification_token &&
        (await bcrypt.compare(password, existingUser.password_hash))
      ) {
        return sendRegistrationVerification(
          email,
          existingUser.verification_token,
          res,
          200,
          "Verification email sent. Please check your inbox.",
        );
      }

      return res.status(400).json({
        success: false,
        message: "Email already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, auth.bcryptSaltRounds);
    const verificationToken = auth.emailVerificationRequired
      ? crypto.randomUUID()
      : null;

    const createdUser = await createUser({
      email,
      passwordHash,
      verificationToken,
      emailVerified: !auth.emailVerificationRequired,
    });

    if (!createdUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered.",
      });
    }

    if (auth.emailVerificationRequired) {
      return sendRegistrationVerification(
        email,
        verificationToken,
        res,
        201,
        "User created.",
      );
    }

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
}

async function verifyEmail(req, res) {
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
}

async function login(req, res) {
  try {
    const { password } = req.body;

    const emailError = validateEmailType(req.body.email);

    if (emailError) {
      return res.status(400).json({
        success: false,
        message: emailError,
      });
    }

    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (password == null || password === "") {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    if (typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Password must be a string.",
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

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: auth.jwtExpiresIn,
      },
    );

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

async function forgotPassword(req, res) {
  try {
    const emailError = validateEmailType(req.body.email);

    if (emailError) {
      return res.status(400).json({
        success: false,
        message: emailError,
      });
    }

    const email = normalizeEmail(req.body.email);

    const user = await findUserByEmail(email);

    if (user) {
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + auth.passwordResetTokenLifetimeMs);

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
}

async function validateResetToken(req, res) {
  try {
    const { token } = req.params;

    const user = await findUserByPasswordResetToken(token);

    if (!hasValidPasswordResetToken(user)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Token valid.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

async function resetPassword(req, res) {
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

    if (!hasValidPasswordResetToken(user)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token.",
      });
    }

    const passwordHash = await bcrypt.hash(password, auth.bcryptSaltRounds);

    const updated = await updatePassword(user.id, passwordHash, token);

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token.",
      });
    }

    try {
      await sendPasswordResetSuccessEmail(user.email);
    } catch (error) {
      console.error(
        "Failed to send password reset success email:",
        error.message,
      );
    }

    return res.status(200).json({
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
}

async function getCurrentUser(req, res) {
  try {
    const user = await findUserByEmail(req.user.email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: Boolean(user.email_verified),
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

module.exports = {
  register,
  verifyEmail,
  login,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getCurrentUser,
};
