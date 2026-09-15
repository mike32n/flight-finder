const request = require("supertest");
const express = require("express");

jest.mock("../models/userModel", () => ({
  findUserByPasswordResetToken: jest.fn(),
  updatePassword: jest.fn(),
}));

jest.mock("../services/emailService", () => ({
  sendPasswordResetSuccessEmail: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
}));

const {
  findUserByPasswordResetToken,
  updatePassword,
} = require("../models/userModel");

const { sendPasswordResetSuccessEmail } = require("../services/emailService");

const bcrypt = require("bcrypt");

const authRoutes = require("../routes/authRoutes");

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

describe("POST /api/auth/reset-password/:token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should reset password with a valid token", async () => {
    const user = {
      id: 1,
      email: "test@example.com",
      password_reset_token: "valid-token",
      password_reset_expires: new Date(Date.now() + 3600000),
    };

    findUserByPasswordResetToken.mockResolvedValue(user);
    bcrypt.hash.mockResolvedValue("hashed-new-password");
    updatePassword.mockResolvedValue();
    sendPasswordResetSuccessEmail.mockResolvedValue();

    const response = await request(app)
      .post("/api/auth/reset-password/valid-token")
      .send({
        password: "NewPassword123!",
      });

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: "Password reset successfully.",
    });

    expect(findUserByPasswordResetToken).toHaveBeenCalledWith("valid-token");

    expect(bcrypt.hash).toHaveBeenCalledWith("NewPassword123!", 10);

    expect(updatePassword).toHaveBeenCalledWith(1, "hashed-new-password");

    expect(sendPasswordResetSuccessEmail).toHaveBeenCalledWith(
      "test@example.com",
    );
  });

  test("should reject an invalid token", async () => {
    findUserByPasswordResetToken.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/auth/reset-password/invalid-token")
      .send({
        password: "NewPassword123!",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired password reset token.",
    });

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  test("should reject an expired token", async () => {
    const user = {
      id: 1,
      email: "test@example.com",
      password_reset_token: "expired-token",
      password_reset_expires: new Date(Date.now() - 1000),
    };

    findUserByPasswordResetToken.mockResolvedValue(user);

    const response = await request(app)
      .post("/api/auth/reset-password/expired-token")
      .send({
        password: "NewPassword123!",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired password reset token.",
    });

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  test("should reject a token without expiration", async () => {
    const user = {
      id: 1,
      email: "test@example.com",
      password_reset_token: "no-expiration-token",
      password_reset_expires: null,
    };

    findUserByPasswordResetToken.mockResolvedValue(user);

    const response = await request(app)
      .post("/api/auth/reset-password/no-expiration-token")
      .send({
        password: "NewPassword123!",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired password reset token.",
    });

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  test("should reject request without a password", async () => {
    const response = await request(app)
      .post("/api/auth/reset-password/valid-token")
      .send({});

    expect(response.statusCode).toBe(400);

    expect(response.body).toEqual({
      success: false,
      message: "Password is required.",
    });

    expect(findUserByPasswordResetToken).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  test("should return 500 when an error occurs", async () => {
    findUserByPasswordResetToken.mockRejectedValue(new Error("Database error"));

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await request(app)
      .post("/api/auth/reset-password/valid-token")
      .send({
        password: "NewPassword123!",
      });

    expect(response.statusCode).toBe(500);

    expect(response.body).toEqual({
      success: false,
      message: "Internal server error.",
    });

    consoleErrorSpy.mockRestore();
  });
});
