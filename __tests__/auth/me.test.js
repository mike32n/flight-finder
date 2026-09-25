const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

jest.mock("../../models/userModel", () => ({
  findUserByEmail: jest.fn(),
}));

const { findUserByEmail } = require("../../models/userModel");

const authRoutes = require("../../routes/authRoutes");

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret";
    jest.clearAllMocks();
  });

  test("should return 401 when no token is provided", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentication required.",
    });

    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  test("should return 401 when token is invalid", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired authentication token.",
    });

    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  test("should return authenticated user data for a valid token", async () => {
    const user = {
      id: 1,
      email: "test@test.com",
      email_verified: 1,
    };

    findUserByEmail.mockResolvedValue(user);

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      user: {
        id: 1,
        email: "test@test.com",
        emailVerified: true,
      },
    });

    expect(findUserByEmail).toHaveBeenCalledWith("test@test.com");
  });

  test("should return 401 when authenticated user no longer exists", async () => {
    findUserByEmail.mockResolvedValue(null);

    const token = jwt.sign(
      {
        userId: 1,
        email: "test@test.com",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      message: "User not found.",
    });
  });
});
