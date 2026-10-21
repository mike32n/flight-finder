jest.mock("../../models/userModel", () => ({
  findUserById: jest.fn(),
}));

jest.mock("../../models/planPolicyModel", () => ({
  findPlanPolicyByName: jest.fn(),
}));

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const planDefaults = require("../../config/planDefaults");
const { findUserById } = require("../../models/userModel");
const { findPlanPolicyByName } = require("../../models/planPolicyModel");
const searchAccessRoutes = require("../../routes/searchAccessRoutes");

const app = express();
app.use("/api/search-access", searchAccessRoutes);

describe("GET /api/search-access", () => {
  let policies;

  beforeEach(() => {
    jest.clearAllMocks();

    policies = Object.fromEntries(
      Object.entries(planDefaults).map(([plan, policy]) => [
        plan,
        { ...policy },
      ]),
    );

    findUserById.mockResolvedValue({
      id: 1,
      email: "access@example.com",
      email_verified: 1,
      plan: "registered",
      is_admin: 0,
    });

    findPlanPolicyByName.mockImplementation(async (plan) => ({
      plan,
      policy_json: JSON.stringify(policies[plan]),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createToken(claims = {}) {
    return jwt.sign({ ...claims, userId: 1 }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  }

  function getAccess(token) {
    const pendingRequest = request(app).get("/api/search-access");

    if (token !== undefined) {
      pendingRequest.set("Authorization", `Bearer ${token}`);
    }

    return pendingRequest;
  }

  test("returns anonymous access without a token", async () => {
    const response = await getAccess();

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      success: true,
      plan: "anonymous",
      policy: planDefaults.anonymous,
    });

    expect(findUserById).not.toHaveBeenCalled();
    expect(findPlanPolicyByName).toHaveBeenCalledWith("anonymous");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers.vary).toContain("Authorization");
  });

  test.each(["registered", "premium"])(
    "returns the stored %s access",
    async (plan) => {
      findUserById.mockResolvedValue({
        id: 1,
        email: "access@example.com",
        email_verified: 1,
        plan,
        is_admin: 0,
      });

      const response = await getAccess(createToken());

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        success: true,
        plan,
        policy: planDefaults[plan],
      });

      expect(findUserById).toHaveBeenCalledWith(1);
      expect(findPlanPolicyByName).toHaveBeenCalledWith(plan);
    },
  );

  test("does not upgrade an administrator based on token claims", async () => {
    findUserById.mockResolvedValue({
      id: 1,
      email: "admin@example.com",
      email_verified: 1,
      plan: "registered",
      is_admin: 1,
    });

    const token = createToken({
      plan: "premium",
      isAdmin: true,
    });

    const response = await getAccess(token);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      success: true,
      plan: "registered",
      policy: planDefaults.registered,
    });
  });

  test("rejects an invalid token without falling back to anonymous", async () => {
    const response = await getAccess("invalid-token");

    expect(response.statusCode).toBe(401);
    expect(response.headers["cache-control"]).toBe("no-store");

    expect(findUserById).not.toHaveBeenCalled();
    expect(findPlanPolicyByName).not.toHaveBeenCalled();
  });

  test("rejects a token belonging to a deleted user", async () => {
    findUserById.mockResolvedValue(null);

    const response = await getAccess(createToken());

    expect(response.statusCode).toBe(401);
    expect(findPlanPolicyByName).not.toHaveBeenCalled();
  });

  test("returns updated policies without requiring a new token", async () => {
    const token = createToken();

    const firstResponse = await getAccess(token);

    expect(firstResponse.statusCode).toBe(200);
    expect(firstResponse.body.policy.smartFlexEnabled).toBe(true);

    policies.registered.smartFlexEnabled = false;

    const secondResponse = await getAccess(token);

    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.body.policy.smartFlexEnabled).toBe(false);
    expect(findPlanPolicyByName).toHaveBeenCalledTimes(2);
  });

  test("returns a server error when the policy cannot be loaded", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    findPlanPolicyByName.mockRejectedValue(new Error("Database unavailable"));

    const response = await getAccess();

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Internal server error.",
    });
    expect(response.headers["cache-control"]).toBe("no-store");
  });
});
