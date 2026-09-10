const request = require("supertest");
const express = require("express");

jest.mock("../models/userModel", () => ({
  createUser: jest.fn(),
  findUserByEmail: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
}));

const bcrypt = require("bcrypt");

const { createUser, findUserByEmail } = require("../models/userModel");

const authRoutes = require("../routes/authRoutes");

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should reject missing email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      password: "Password1",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email is required.");
  });
  test("should reject invalid email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "abc",
      password: "Password1",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Please enter a valid email address.");
  });
  test("should reject missing password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Password is required.");
  });
  test("should reject short password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "Pass1",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Password must be at least 8 characters.",
    );
  });
  test("should reject weak password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "password",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Password must contain uppercase, lowercase and number.",
    );
  });
  test("should reject duplicate email", async () => {
    findUserByEmail.mockResolvedValue({
      id: 1,
      email: "test@test.com",
    });

    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "Password1",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email already registered.");
  });
  test("should create user", async () => {
    findUserByEmail.mockResolvedValue(null);

    bcrypt.hash.mockResolvedValue("hashed-password");

    createUser.mockResolvedValue({
      id: 1,
    });

    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "Password1",
    });

    expect(response.status).toBe(201);

    expect(response.body).toEqual({
      success: true,
      message: "User created.",
    });

    expect(createUser).toHaveBeenCalledTimes(1);
  });
});
