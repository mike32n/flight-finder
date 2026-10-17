const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

jest.mock("../../models/userModel", () => ({
  findUserById: jest.fn(),
}));

const { findUserById } = require("../../models/userModel");
const authRoutes = require("../../routes/authRoutes");

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

function createToken(payload = {}) {
  return jwt.sign(
    {
      userId: 1,
      email: "old@example.com",
      ...payload,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    },
  );
}

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret";

    findUserById.mockReset();
    findUserById.mockResolvedValue({
      id: 1,
      email: "current@example.com",
      email_verified: 1,
      plan: "registered",
      is_admin: 0,
      password_hash: "must-not-be-returned",
      verification_token: "must-not-be-returned",
    });
  });

  test("returns 401 without a token and does not query the database", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required.",
    });

    expect(findUserById).not.toHaveBeenCalled();
  });

  test("returns 401 for an invalid token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired authentication token.",
    });

    expect(findUserById).not.toHaveBeenCalled();
  });

  test("returns current database values instead of token claims", async () => {
    const token = createToken({
      plan: "premium",
      isAdmin: true,
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      user: {
        id: 1,
        email: "current@example.com",
        emailVerified: true,
        plan: "registered",
        isAdmin: false,
      },
    });

    expect(findUserById).toHaveBeenCalledWith(1);
  });

  test("returns 401 when the account no longer exists", async () => {
    findUserById.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "User not found.",
    });
  });

  test.each([undefined, null, 0, -1, "1"])(
    "rejects an invalid token user ID: %p",
    async (userId) => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${createToken({ userId })}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: "Invalid authentication token.",
      });

      expect(findUserById).not.toHaveBeenCalled();
    },
  );

  test("reflects access changes while using the same token", async () => {
    const token = createToken();

    findUserById
      .mockResolvedValueOnce({
        id: 1,
        email: "current@example.com",
        email_verified: 1,
        plan: "premium",
        is_admin: 1,
      })
      .mockResolvedValueOnce({
        id: 1,
        email: "current@example.com",
        email_verified: 1,
        plan: "registered",
        is_admin: 0,
      });

    const first = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    const second = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    expect(first.body.user).toEqual(
      expect.objectContaining({
        plan: "premium",
        isAdmin: true,
      }),
    );

    expect(second.body.user).toEqual(
      expect.objectContaining({
        plan: "registered",
        isAdmin: false,
      }),
    );

    expect(findUserById).toHaveBeenCalledTimes(2);
  });

  test("returns 500 when the database lookup fails", async () => {
    findUserById.mockRejectedValue(new Error("Database unavailable"));

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${createToken()}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Internal server error.",
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
