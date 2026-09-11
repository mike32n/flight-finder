const request = require("supertest");
const express = require("express");

jest.mock("../models/userModel", () => ({
  findUserByEmail: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  compare: jest.fn().mockResolvedValue(false),
}));

const { findUserByEmail } = require("../models/userModel");
const bcrypt = require("bcrypt");

const authRoutes = require("../routes/authRoutes");

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    findUserByEmail.mockReset();
    bcrypt.compare.mockReset();

    bcrypt.compare.mockResolvedValue(false);
  });

  test("should reject missing email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      password: "Password1",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Email is required.",
    });
  });

  test("should reject missing password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Password is required.",
    });
  });

  test("should reject non-existent email", async () => {
    findUserByEmail.mockResolvedValue(null);
    const response = await request(app).post("/api/auth/login").send({
      email: "invalid-user@example.com",
      password: "Password1",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid email or password.",
    });
  });

  test("should reject invalid password", async () => {
    const mockUser = {
      id: 1,
      email: "user@example.com",
      password_hash: "stored-password-hash",
    };

    findUserByEmail.mockResolvedValue(mockUser);

    const response = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
      password: "WrongPassword",
    });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid email or password.",
    });
  });

  test("should reject if email is not verified", async () => {
    bcrypt.compare.mockResolvedValue(true);
    const mockUser = {
      id: 1,
      email: "user@example.com",
      password_hash: "stored-password-hash",
      email_verified: 0,
    };

    findUserByEmail.mockResolvedValue(mockUser);

    const response = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
      password: "Password1",
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Please verify your email before logging in.",
    });
  });

  test("should login successfully with valid credentials", async () => {
    bcrypt.compare.mockResolvedValue(true);
    const mockUser = {
      id: 1,
      email: "user@example.com",
      password_hash: "stored-password-hash",
      email_verified: 1,
    };

    findUserByEmail.mockResolvedValue(mockUser);

    const response = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
      password: "Password1",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Login successful.",
    });
    expect(bcrypt.compare).toHaveBeenCalledWith(
      "Password1",
      "stored-password-hash",
    );
    expect(findUserByEmail).toHaveBeenCalledWith("user@example.com");
  });

  test("should return 500 if database lookup fails", async () => {
    findUserByEmail.mockRejectedValue(new Error("Database error"));

    const response = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
      password: "Password1",
    });

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      success: false,
      message: "Internal server error.",
    });
  });

  test("should return 500 if bcrypt compare fails", async () => {
    findUserByEmail.mockResolvedValue({
      id: 1,
      email: "user@example.com",
      password_hash: "hash",
      email_verified: 1,
    });

    bcrypt.compare.mockRejectedValue(new Error("bcrypt error"));

    const response = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
      password: "Password1",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Internal server error.",
    });
  });
});
