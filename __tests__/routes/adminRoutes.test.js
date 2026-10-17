const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../../models/userModel", () => ({
  findUserById: jest.fn(),
}));

jest.mock("../../models/planPolicyModel", () => ({
  findPlanPolicyByName: jest.fn(),
  updatePlanPolicyByName: jest.fn(),
}));

const { findUserById } = require("../../models/userModel");
const {
  findPlanPolicyByName,
  updatePlanPolicyByName,
} = require("../../models/planPolicyModel");
const planDefaults = require("../../config/planDefaults");
const adminRoutes = require("../../routes/adminRoutes");

const app = express();

app.use(express.json());
app.use("/api/admin", adminRoutes);

function createToken() {
  return jwt.sign(
    {
      userId: 1,
      email: "admin@example.com",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    },
  );
}

describe("GET /api/admin/plan-policies", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret";

    findUserById.mockReset();
    findUserById.mockResolvedValue({
      id: 1,
      email: "admin@example.com",
      email_verified: 1,
      plan: "registered",
      is_admin: 1,
    });

    findPlanPolicyByName.mockReset();
    findPlanPolicyByName.mockImplementation(async (plan) => ({
      plan,
      policy_json: JSON.stringify(planDefaults[plan]),
    }));
  });

  test("rejects unauthenticated requests without reading policies", async () => {
    const response = await request(app).get("/api/admin/plan-policies");

    expect(response.status).toBe(401);
    expect(findUserById).not.toHaveBeenCalled();
    expect(findPlanPolicyByName).not.toHaveBeenCalled();
  });

  test.each(["registered", "premium"])(
    "rejects non-admin users with the %s plan",
    async (plan) => {
      findUserById.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        email_verified: 1,
        plan,
        is_admin: 0,
      });

      const response = await request(app)
        .get("/api/admin/plan-policies")
        .set("Authorization", `Bearer ${createToken()}`);

      expect(response.status).toBe(403);
      expect(findPlanPolicyByName).not.toHaveBeenCalled();
    },
  );

  test("returns all stored policies including customized values", async () => {
    const customRegisteredPolicy = {
      ...planDefaults.registered,
      maxDestinations: 1,
      canSelectStartDate: true,
    };

    findPlanPolicyByName.mockImplementation(async (plan) => ({
      plan,
      policy_json: JSON.stringify(
        plan === "registered" ? customRegisteredPolicy : planDefaults[plan],
      ),
    }));

    const response = await request(app)
      .get("/api/admin/plan-policies")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");

    expect(response.body).toEqual({
      success: true,
      policies: {
        anonymous: planDefaults.anonymous,
        registered: customRegisteredPolicy,
        premium: planDefaults.premium,
      },
    });

    expect(findPlanPolicyByName).toHaveBeenCalledTimes(3);

    for (const plan of Object.keys(planDefaults)) {
      expect(findPlanPolicyByName).toHaveBeenCalledWith(plan);
    }
  });

  describe("configuration errors", () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test.each(
      [
        null,
        {
          plan: "anonymous",
          policy_json: "{invalid-json",
        },
        {
          plan: "anonymous",
          policy_json: JSON.stringify({
            ...planDefaults.anonymous,
            maxDestinations: 0,
          }),
        },
      ].map((row) => [row]),
    )("rejects a missing or invalid stored policy: %p", async (row) => {
      findPlanPolicyByName.mockResolvedValueOnce(row);

      const response = await request(app)
        .get("/api/admin/plan-policies")
        .set("Authorization", `Bearer ${createToken()}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Internal server error.",
      });
    });

    test("returns a generic error when the database lookup fails", async () => {
      findPlanPolicyByName.mockRejectedValue(new Error("Database unavailable"));

      const response = await request(app)
        .get("/api/admin/plan-policies")
        .set("Authorization", `Bearer ${createToken()}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Internal server error.",
      });
    });
  });
});

describe("PUT /api/admin/plan-policies/:plan", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret";

    findUserById.mockReset();
    findUserById.mockResolvedValue({
      id: 1,
      email: "admin@example.com",
      email_verified: 1,
      plan: "registered",
      is_admin: 1,
    });

    updatePlanPolicyByName.mockReset();
    updatePlanPolicyByName.mockResolvedValue(true);
  });

  test("rejects unauthenticated requests without writing", async () => {
    const response = await request(app)
      .put("/api/admin/plan-policies/registered")
      .send(planDefaults.registered);

    expect(response.status).toBe(401);
    expect(updatePlanPolicyByName).not.toHaveBeenCalled();
  });

  test.each(["registered", "premium"])(
    "rejects non-admin users with the %s plan",
    async (plan) => {
      findUserById.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        email_verified: 1,
        plan,
        is_admin: 0,
      });

      const response = await request(app)
        .put("/api/admin/plan-policies/registered")
        .set("Authorization", `Bearer ${createToken()}`)
        .send(planDefaults.registered);

      expect(response.status).toBe(403);
      expect(updatePlanPolicyByName).not.toHaveBeenCalled();
    },
  );

  test("saves a valid configuration", async () => {
    const policy = {
      ...planDefaults.registered,
      maxDestinations: 1,
      canSelectStartDate: true,
    };

    const response = await request(app)
      .put("/api/admin/plan-policies/registered")
      .set("Authorization", `Bearer ${createToken()}`)
      .send(policy);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");

    expect(response.body).toEqual({
      success: true,
      plan: "registered",
      policy,
    });

    expect(updatePlanPolicyByName).toHaveBeenCalledTimes(1);

    const [savedPlan, savedJson] = updatePlanPolicyByName.mock.calls[0];

    expect(savedPlan).toBe("registered");
    expect(JSON.parse(savedJson)).toEqual(policy);
  });

  test.each([
    [
      "an invalid destination limit",
      {
        ...planDefaults.registered,
        maxDestinations: 0,
      },
    ],
    [
      "an unknown field",
      {
        ...planDefaults.registered,
        isAdmin: true,
      },
    ],
    [
      "an incomplete configuration",
      {
        maxDestinations: 1,
      },
    ],
  ])("rejects %s without writing", async (label, policy) => {
    const response = await request(app)
      .put("/api/admin/plan-policies/registered")
      .set("Authorization", `Bearer ${createToken()}`)
      .send(policy);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toEqual(expect.any(String));
    expect(updatePlanPolicyByName).not.toHaveBeenCalled();
  });

  test("rejects an unknown plan without writing", async () => {
    const response = await request(app)
      .put("/api/admin/plan-policies/admin")
      .set("Authorization", `Bearer ${createToken()}`)
      .send(planDefaults.premium);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Unknown plan",
    });

    expect(updatePlanPolicyByName).not.toHaveBeenCalled();
  });

  test("returns 404 when the stored plan is missing", async () => {
    updatePlanPolicyByName.mockResolvedValue(false);

    const response = await request(app)
      .put("/api/admin/plan-policies/premium")
      .set("Authorization", `Bearer ${createToken()}`)
      .send(planDefaults.premium);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Missing policy for premium",
    });
  });

  test("returns a generic error when saving fails", async () => {
    updatePlanPolicyByName.mockRejectedValue(
      new Error("Database write failed"),
    );

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await request(app)
        .put("/api/admin/plan-policies/registered")
        .set("Authorization", `Bearer ${createToken()}`)
        .send(planDefaults.registered);

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
