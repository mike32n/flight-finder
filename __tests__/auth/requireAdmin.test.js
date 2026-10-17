const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../../models/userModel", () => ({
  findUserById: jest.fn(),
}));

const { findUserById } = require("../../models/userModel");
const { authenticateToken } = require("../../middlewares/authMiddleware");
const { loadUserAccess } = require("../../middlewares/loadUserAccess");
const { requireAdmin } = require("../../middlewares/requireAdmin");

const app = express();

app.get(
  "/admin-only",
  authenticateToken,
  loadUserAccess,
  requireAdmin,
  (req, res) => {
    res.json({
      success: true,
    });
  },
);

function createToken(payload = {}) {
  return jwt.sign(
    {
      userId: 1,
      email: "user@example.com",
      ...payload,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    },
  );
}

describe("admin route protection", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret";

    findUserById.mockReset();
    findUserById.mockResolvedValue({
      id: 1,
      email: "user@example.com",
      email_verified: 1,
      plan: "registered",
      is_admin: 0,
    });
  });

  test("rejects a request without authentication", async () => {
    const response = await request(app).get("/admin-only");

    expect(response.status).toBe(401);
    expect(findUserById).not.toHaveBeenCalled();
  });

  test("rejects an invalid token before querying the database", async () => {
    const response = await request(app)
      .get("/admin-only")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(findUserById).not.toHaveBeenCalled();
  });

  test.each(["registered", "premium"])(
    "rejects a non-admin user with the %s plan",
    async (plan) => {
      findUserById.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        email_verified: 1,
        plan,
        is_admin: 0,
      });

      const response = await request(app)
        .get("/admin-only")
        .set("Authorization", `Bearer ${createToken()}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        message: "Admin access required.",
      });
    },
  );

  test.each(["registered", "premium"])(
    "allows an admin user with the %s plan",
    async (plan) => {
      findUserById.mockResolvedValue({
        id: 1,
        email: "admin@example.com",
        email_verified: 1,
        plan,
        is_admin: 1,
      });

      const response = await request(app)
        .get("/admin-only")
        .set("Authorization", `Bearer ${createToken()}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
      });
    },
  );

  test("does not grant admin access from token claims", async () => {
    const token = createToken({
      plan: "premium",
      isAdmin: true,
      is_admin: 1,
    });

    const response = await request(app)
      .get("/admin-only")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Admin access required.");
  });

  test("denies access after admin status is revoked using the same token", async () => {
    const token = createToken();

    findUserById
      .mockResolvedValueOnce({
        id: 1,
        email: "admin@example.com",
        email_verified: 1,
        plan: "registered",
        is_admin: 1,
      })
      .mockResolvedValueOnce({
        id: 1,
        email: "admin@example.com",
        email_verified: 1,
        plan: "registered",
        is_admin: 0,
      });

    const first = await request(app)
      .get("/admin-only")
      .set("Authorization", `Bearer ${token}`);

    const second = await request(app)
      .get("/admin-only")
      .set("Authorization", `Bearer ${token}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(403);
    expect(findUserById).toHaveBeenCalledTimes(2);
  });
});

describe("requireAdmin", () => {
  test("rejects a request without a resolved current user", () => {
    const req = {
      user: {
        isAdmin: true,
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test.each([false, undefined, 0, 1, "true"])(
    "rejects a current-user admin flag that is not boolean true: %p",
    (isAdmin) => {
      const req = {
        currentUser: {
          isAdmin,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    },
  );
});
