const request = require("supertest");
const express = require("express");

jest.mock("../models/userModel", () => ({
  findUserByEmail: jest.fn(),
  savePasswordResetToken: jest.fn(),
}));

jest.mock("../services/emailService", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

const {
  findUserByEmail,
  savePasswordResetToken,
} = require("../models/userModel");

const { sendPasswordResetEmail } = require("../services/emailService");

const authRoutes = require("../routes/authRoutes");

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should send password reset email for existing user", async () => {
    const user = {
      id: 1,
      email: "test@example.com",
    };

    findUserByEmail.mockResolvedValue(user);
    savePasswordResetToken.mockResolvedValue();
    sendPasswordResetEmail.mockResolvedValue();

    const response = await request(app).post("/api/auth/forgot-password").send({
      email: "TEST@EXAMPLE.COM ",
    });

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message:
        "If the email address is registered, a password reset email has been sent.",
    });

    expect(findUserByEmail).toHaveBeenCalledWith("test@example.com");

    expect(savePasswordResetToken).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(Date),
    );

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      "test@example.com",
      expect.any(String),
    );
  });

  test("should return the same response when email does not exist", async () => {
    findUserByEmail.mockResolvedValue(null);

    const response = await request(app).post("/api/auth/forgot-password").send({
      email: "unknown@example.com",
    });

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message:
        "If the email address is registered, a password reset email has been sent.",
    });

    expect(savePasswordResetToken).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  test("should normalize email before searching", async () => {
    findUserByEmail.mockResolvedValue(null);

    await request(app).post("/api/auth/forgot-password").send({
      email: "  TEST@EXAMPLE.COM  ",
    });

    expect(findUserByEmail).toHaveBeenCalledWith("test@example.com");
  });

  test("should generate a reset token and one-hour expiration", async () => {
    const user = {
      id: 1,
      email: "test@example.com",
    };

    findUserByEmail.mockResolvedValue(user);
    savePasswordResetToken.mockResolvedValue();
    sendPasswordResetEmail.mockResolvedValue();

    const before = Date.now();

    await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com",
    });

    const after = Date.now();

    const [userId, token, expires] = savePasswordResetToken.mock.calls[0];

    expect(userId).toBe(1);
    expect(token).toEqual(expect.any(String));
    expect(expires).toEqual(expect.any(Date));

    const expiresTime = expires.getTime();

    expect(expiresTime).toBeGreaterThanOrEqual(before + 3600000);

    expect(expiresTime).toBeLessThanOrEqual(after + 3600000);
  });

  test("should return 500 when an error occurs", async () => {
    findUserByEmail.mockRejectedValue(new Error("Database error"));

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com",
    });

    expect(response.statusCode).toBe(500);

    expect(response.body).toEqual({
      success: false,
      message: "Internal server error.",
    });

    consoleErrorSpy.mockRestore();
  });

  test("should return 500 when saving reset token fails", async () => {
    const user = {
      id: 1,
      email: "test@example.com",
    };

    findUserByEmail.mockResolvedValue(user);
    savePasswordResetToken.mockRejectedValue(new Error("Database error"));

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com",
    });

    expect(response.statusCode).toBe(500);

    expect(response.body).toEqual({
      success: false,
      message: "Internal server error.",
    });

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test("should return 500 when sending reset email fails", async () => {
    const user = {
      id: 1,
      email: "test@example.com",
    };

    findUserByEmail.mockResolvedValue(user);
    savePasswordResetToken.mockResolvedValue();
    sendPasswordResetEmail.mockRejectedValue(new Error("Email sending failed"));

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com",
    });

    expect(response.statusCode).toBe(500);

    expect(response.body).toEqual({
      success: false,
      message: "Internal server error.",
    });

    expect(savePasswordResetToken).toHaveBeenCalled();
    expect(sendPasswordResetEmail).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
