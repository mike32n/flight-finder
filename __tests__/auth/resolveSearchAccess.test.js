const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../../models/userModel", () => ({
  findUserById: jest.fn(),
}));

jest.mock("../../models/planPolicyModel", () => ({
  findPlanPolicyByName: jest.fn(),
}));

const { findUserById } = require("../../models/userModel");
const { findPlanPolicyByName } = require("../../models/planPolicyModel");
const planDefaults = require("../../config/planDefaults");
const {
  resolveSearchAccess,
} = require("../../middlewares/resolveSearchAccess");

const app = express();

app.use(express.json());

app.post("/search-access", resolveSearchAccess, (req, res) => {
  res.json({
    success: true,
    ...req.searchAccess,
  });
});

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

describe("resolveSearchAccess", () => {
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

    findPlanPolicyByName.mockReset();
    findPlanPolicyByName.mockImplementation(async (plan) => ({
      plan,
      policy_json: JSON.stringify(planDefaults[plan]),
    }));
  });

  test("uses anonymous access without a token despite client-supplied claims", async () => {
    const response = await request(app).post("/search-access").send({
      plan: "premium",
      isAdmin: true,
      policy: planDefaults.premium,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      plan: "anonymous",
      policy: planDefaults.anonymous,
    });

    expect(findUserById).not.toHaveBeenCalled();
    expect(findPlanPolicyByName).toHaveBeenCalledWith("anonymous");
  });

  test.each([
    ["registered", 0],
    ["registered", 1],
    ["premium", 0],
  ])("uses the stored %s plan with admin status %s", async (plan, isAdmin) => {
    findUserById.mockResolvedValue({
      id: 1,
      email: "user@example.com",
      email_verified: 1,
      plan,
      is_admin: isAdmin,
    });

    const token = createToken({
      plan: "premium",
      isAdmin: true,
    });

    const response = await request(app)
      .post("/search-access")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "premium" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      plan,
      policy: planDefaults[plan],
    });

    expect(findUserById).toHaveBeenCalledWith(1);
    expect(findPlanPolicyByName).toHaveBeenCalledWith(plan);
  });

  test("uses the customized stored policy for anonymous visitors", async () => {
    const customPolicy = {
      ...planDefaults.anonymous,
      smartFlexEnabled: true,
    };

    findPlanPolicyByName.mockResolvedValue({
      plan: "anonymous",
      policy_json: JSON.stringify(customPolicy),
    });

    const response = await request(app).post("/search-access");

    expect(response.status).toBe(200);
    expect(response.body.policy).toEqual(customPolicy);
  });

  test("rejects an invalid token instead of using anonymous access", async () => {
    const response = await request(app)
      .post("/search-access")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(findUserById).not.toHaveBeenCalled();
    expect(findPlanPolicyByName).not.toHaveBeenCalled();
  });

  test("rejects an empty authorization header", async () => {
    const response = await request(app)
      .post("/search-access")
      .set("Authorization", "");

    expect(response.status).toBe(401);
    expect(findPlanPolicyByName).not.toHaveBeenCalled();
  });

  test("rejects a token whose account no longer exists", async () => {
    findUserById.mockResolvedValue(null);

    const response = await request(app)
      .post("/search-access")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(response.status).toBe(401);
    expect(findPlanPolicyByName).not.toHaveBeenCalled();
  });

  test("reflects a plan change while using the same token", async () => {
    const token = createToken();

    findUserById
      .mockResolvedValueOnce({
        id: 1,
        email: "user@example.com",
        email_verified: 1,
        plan: "premium",
        is_admin: 0,
      })
      .mockResolvedValueOnce({
        id: 1,
        email: "user@example.com",
        email_verified: 1,
        plan: "registered",
        is_admin: 0,
      });

    const first = await request(app)
      .post("/search-access")
      .set("Authorization", `Bearer ${token}`);

    const second = await request(app)
      .post("/search-access")
      .set("Authorization", `Bearer ${token}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    expect(first.body.plan).toBe("premium");
    expect(second.body.plan).toBe("registered");

    expect(findPlanPolicyByName).toHaveBeenNthCalledWith(1, "premium");
    expect(findPlanPolicyByName).toHaveBeenNthCalledWith(2, "registered");
  });

  describe("policy lookup failures", () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test("does not fall back to defaults when the policy is missing", async () => {
      findPlanPolicyByName.mockResolvedValue(null);

      const response = await request(app).post("/search-access");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Internal server error.",
      });
    });

    test("returns a generic error when the policy lookup fails", async () => {
      findPlanPolicyByName.mockRejectedValue(new Error("Database unavailable"));

      const response = await request(app).post("/search-access");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Internal server error.",
      });
    });
  });
});
