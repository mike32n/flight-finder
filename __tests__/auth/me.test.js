const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

jest.mock("../../models/userModel", () => ({
  findUserById: jest.fn(),
  updateSmartFlexPreference: jest.fn(),
}));

const {
  findUserById,
  updateSmartFlexPreference,
} = require("../../models/userModel");
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
      smart_flex_preference: true,
      smart_flex_preference_version: 0,
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
        smartFlexPreference: true,
        smartFlexPreferenceVersion: 0,
      },
    });

    expect(findUserById).toHaveBeenCalledWith(1);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  test("returns a saved false preference", async () => {
    findUserById.mockResolvedValue({
      id: 1,
      email: "current@example.com",
      email_verified: 1,
      plan: "registered",
      is_admin: 0,
      smart_flex_preference: false,
      smart_flex_preference_version: 7,
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.user.smartFlexPreference).toBe(false);
    expect(response.body.user.smartFlexPreferenceVersion).toBe(7);
  });

  test.each([undefined, null, 0, 1])(
    "rejects an invalid stored preference instead of returning %p",
    async (preference) => {
      findUserById.mockResolvedValue({
        id: 1,
        smart_flex_preference: preference,
      });
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
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    },
  );

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
        smart_flex_preference: true,
      })
      .mockResolvedValueOnce({
        id: 1,
        email: "current@example.com",
        email_verified: 1,
        plan: "registered",
        is_admin: 0,
        smart_flex_preference: false,
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
        smartFlexPreference: true,
      }),
    );

    expect(second.body.user).toEqual(
      expect.objectContaining({
        plan: "registered",
        isAdmin: false,
        smartFlexPreference: false,
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

describe("PATCH /api/auth/me", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret";
    findUserById.mockReset();
    findUserById.mockResolvedValue({
      id: 1,
      email: "current@example.com",
      email_verified: 1,
      plan: "registered",
      is_admin: 0,
      smart_flex_preference: true,
      smart_flex_preference_version: 0,
    });
    updateSmartFlexPreference.mockReset();
    updateSmartFlexPreference.mockResolvedValue({
      status: "updated",
      smartFlexPreferenceVersion: 1,
    });
  });

  test("returns 401 without a token and does not query or update the database", async () => {
    const response = await request(app)
      .patch("/api/auth/me")
      .send({
        smartFlexPreference: false,
        expectedSmartFlexPreferenceVersion: 0,
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required.",
    });
    expect(findUserById).not.toHaveBeenCalled();
    expect(updateSmartFlexPreference).not.toHaveBeenCalled();
  });

  test("returns 401 for an invalid token", async () => {
    const response = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", "Bearer invalid-token")
      .send({
        smartFlexPreference: false,
        expectedSmartFlexPreferenceVersion: 0,
      });

    expect(response.status).toBe(401);
    expect(findUserById).not.toHaveBeenCalled();
    expect(updateSmartFlexPreference).not.toHaveBeenCalled();
  });

  test("rejects a missing request body", async () => {
    const response = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(updateSmartFlexPreference).not.toHaveBeenCalled();
  });

  test.each([true, false])(
    "updates the authenticated user's preference to %p",
    async (preference) => {
      const response = await request(app)
        .patch("/api/auth/me")
        .set("Authorization", `Bearer ${createToken()}`)
        .send({
          smartFlexPreference: preference,
          expectedSmartFlexPreferenceVersion: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        smartFlexPreference: preference,
        smartFlexPreferenceVersion: 1,
      });
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(updateSmartFlexPreference).toHaveBeenCalledWith(1, preference, 0);
    },
  );

  test.each([
    {},
    { smartFlexPreference: true },
    { expectedSmartFlexPreferenceVersion: 0 },
    { smartFlexPreference: null, expectedSmartFlexPreferenceVersion: 0 },
    { smartFlexPreference: 0, expectedSmartFlexPreferenceVersion: 0 },
    { smartFlexPreference: 1, expectedSmartFlexPreferenceVersion: 0 },
    { smartFlexPreference: "false", expectedSmartFlexPreferenceVersion: 0 },
    { smartFlexPreference: [], expectedSmartFlexPreferenceVersion: 0 },
    { smartFlexPreference: {}, expectedSmartFlexPreferenceVersion: 0 },
    {
      smartFlexPreference: true,
      expectedSmartFlexPreferenceVersion: 0,
      userId: 2,
    },
    {
      smartFlexPreference: false,
      expectedSmartFlexPreferenceVersion: 0,
      extra: true,
    },
    [],
  ])("rejects an invalid body: %p", async (body) => {
    const response = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${createToken()}`)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(updateSmartFlexPreference).not.toHaveBeenCalled();
  });

  test.each([-1, 0.5, "0", null, undefined, {}, []])(
    "rejects an invalid expected version: %p",
    async (expectedSmartFlexPreferenceVersion) => {
      const response = await request(app)
        .patch("/api/auth/me")
        .set("Authorization", `Bearer ${createToken()}`)
        .send({
          smartFlexPreference: true,
          expectedSmartFlexPreferenceVersion,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(updateSmartFlexPreference).not.toHaveBeenCalled();
    },
  );

  test("updates the database user identified by the authenticated token", async () => {
    findUserById.mockResolvedValue({
      id: 2,
      email: "other@example.com",
      email_verified: 1,
      plan: "registered",
      is_admin: 0,
      smart_flex_preference: true,
      smart_flex_preference_version: 0,
    });

    const response = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${createToken({ userId: 2 })}`)
      .send({
        smartFlexPreference: false,
        expectedSmartFlexPreferenceVersion: 0,
      });

    expect(response.status).toBe(200);
    expect(findUserById).toHaveBeenCalledWith(2);
    expect(updateSmartFlexPreference).toHaveBeenCalledWith(2, false, 0);
  });

  test("returns 401 if the user was deleted before loading", async () => {
    findUserById.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({
        smartFlexPreference: false,
        expectedSmartFlexPreferenceVersion: 0,
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "User not found.",
    });
    expect(updateSmartFlexPreference).not.toHaveBeenCalled();
  });

  test("returns 401 if the user is deleted before the update", async () => {
    updateSmartFlexPreference.mockResolvedValue({ status: "missing" });

    const response = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({
        smartFlexPreference: false,
        expectedSmartFlexPreferenceVersion: 0,
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "User not found.",
    });
  });

  test("returns 409 when the expected version is stale", async () => {
    updateSmartFlexPreference.mockResolvedValue({ status: "conflict" });

    const response = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${createToken()}`)
      .send({
        smartFlexPreference: false,
        expectedSmartFlexPreferenceVersion: 0,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      code: "SMART_FLEX_PREFERENCE_VERSION_CONFLICT",
      message:
        "Smart Flex preference was updated by another request. Refresh and try again.",
    });
  });

  test.each(["lookup", "update"])(
    "returns 500 and logs a database %s error",
    async (operation) => {
      const error = new Error("Database unavailable");
      if (operation === "lookup") {
        findUserById.mockRejectedValue(error);
      } else {
        updateSmartFlexPreference.mockRejectedValue(error);
      }
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      try {
        const response = await request(app)
          .patch("/api/auth/me")
          .set("Authorization", `Bearer ${createToken()}`)
          .send({
            smartFlexPreference: false,
            expectedSmartFlexPreferenceVersion: 0,
          });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          message: "Internal server error.",
        });
        expect(consoleSpy).toHaveBeenCalledWith(error);
      } finally {
        consoleSpy.mockRestore();
      }
    },
  );
});
