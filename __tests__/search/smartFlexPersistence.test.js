process.env.DB_PATH = ":memory:";

jest.mock("../../providers/providerFactory", () => ({
  getProvider: jest.fn().mockReturnValue({ searchFlights: jest.fn() }),
}));

jest.mock("../../config/providerConfig", () => ({
  concurrency: 5,
}));

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { initDb, closeDb } = require("../../db");
const appConfig = require("../../config/appConfig");
const { getProvider } = require("../../providers/providerFactory");
const {
  createUser,
  findUserById,
  grantAdminByEmail,
  updateSmartFlexPreference,
} = require("../../models/userModel");
const { findPlanPolicyByName } = require("../../models/planPolicyModel");
const {
  getPlanPolicy,
  updatePlanPolicy,
} = require("../../services/planPolicyService");
const adminRoutes = require("../../routes/adminRoutes");
const searchAccessRoutes = require("../../routes/searchAccessRoutes");
const { router } = require("../../routes/searchRoutes");
const providerSearch = getProvider().searchFlights;

const app = express();
app.use(express.json());
app.use("/", router);
app.use("/api/admin", adminRoutes);
app.use("/api/search-access", searchAccessRoutes);

describe.each(["/search", "/search-stream"])(
  "%s stored Smart Flex preference",
  (endpoint) => {
    let originalWeeks;
    let originalFlex;

    beforeEach(async () => {
      process.env.JWT_SECRET = "test-jwt-secret";
      await initDb();
      originalWeeks = appConfig.search.weeksToGenerate;
      originalFlex = appConfig.smartFlex.enabled;
      appConfig.search.weeksToGenerate = 1;
      appConfig.smartFlex.enabled = true;
      providerSearch
        .mockReset()
        .mockImplementation(async (destination, departure, returnDate) => ({
          success: true,
          data: {
            destination,
            departure,
            return: returnDate,
            price: 30000,
            currency: "HUF",
          },
        }));
    });

    afterEach(async () => {
      appConfig.search.weeksToGenerate = originalWeeks;
      appConfig.smartFlex.enabled = originalFlex;
      await closeDb();
    });

    test("preserves each preference when policy is disabled and re-enabled", async () => {
      const onUser = await createUser({
        email: "flex-on@example.com",
        passwordHash: "hash",
        verificationToken: null,
      });
      const offUser = await createUser({
        email: "flex-off@example.com",
        passwordHash: "hash",
        verificationToken: null,
      });
      await expect(
        updateSmartFlexPreference(offUser.id, false, 0),
      ).resolves.toEqual({
        status: "updated",
        smartFlexPreferenceVersion: 1,
      });

      const onToken = jwt.sign({ userId: onUser.id }, process.env.JWT_SECRET);
      const offToken = jwt.sign({ userId: offUser.id }, process.env.JWT_SECRET);
      const policy = await getPlanPolicy("registered");

      async function expectPermission(token, expected) {
        providerSearch.mockClear();
        const response = await request(app)
          .post(endpoint)
          .set("Authorization", `Bearer ${token}`)
          .send({
            origin: "VIE",
            destinations: ["AMS"],
            weekday: 6,
            nights: 1,
          });

        expect(response.status).toBe(200);
        if (expected) {
          expect(providerSearch.mock.calls.length).toBeGreaterThan(1);
        } else {
          expect(providerSearch).toHaveBeenCalledTimes(1);
        }
      }

      async function expectSavedPreferences() {
        const savedOnUser = await findUserById(onUser.id);
        const savedOffUser = await findUserById(offUser.id);
        expect(savedOnUser.smart_flex_preference).toBe(true);
        expect(savedOffUser.smart_flex_preference).toBe(false);
      }

      await updatePlanPolicy("registered", {
        ...policy,
        smartFlexEnabled: false,
      });
      await expectPermission(onToken, false);
      await expectPermission(offToken, false);
      await expectSavedPreferences();

      await updatePlanPolicy("registered", {
        ...policy,
        smartFlexEnabled: true,
      });
      await expectPermission(onToken, true);
      await expectPermission(offToken, false);
      await expectSavedPreferences();
    });

    test("applies an admin-saved five-destination policy to a registered user", async () => {
      const admin = await createUser({
        email: "policy-admin@example.com",
        passwordHash: "hash",
        verificationToken: null,
        emailVerified: true,
      });
      await expect(grantAdminByEmail("policy-admin@example.com")).resolves.toBe(
        true,
      );
      const user = await createUser({
        email: "policy-user@example.com",
        passwordHash: "hash",
        verificationToken: null,
        emailVerified: true,
      });
      await expect(updateSmartFlexPreference(user.id, false, 0)).resolves.toEqual({
        status: "updated",
        smartFlexPreferenceVersion: 1,
      });
      expect(await findUserById(admin.id)).toEqual(
        expect.objectContaining({ plan: "registered", is_admin: 1 }),
      );
      expect(await findUserById(user.id)).toEqual(
        expect.objectContaining({ plan: "registered", is_admin: 0 }),
      );

      const adminToken = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET);
      const userToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
      const destinations = ["AMS", "BCN", "LCA", "CFU", "FCO"];
      const parameters = {
        origin: "VIE",
        destinations,
        weekday: 6,
        nights: 1,
      };
      const originalPolicy = await getPlanPolicy("registered");
      expect(originalPolicy.maxDestinations).toBe(3);

      const beforeUpdate = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${userToken}`)
        .send(parameters);
      expect(beforeUpdate.status).toBe(400);
      expect(beforeUpdate.body).toEqual({
        error: "Your plan allows up to 3 destinations.",
      });
      expect(providerSearch).not.toHaveBeenCalled();

      const updatedPolicy = { ...originalPolicy, maxDestinations: 5 };
      const update = await request(app)
        .put("/api/admin/plan-policies/registered")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updatedPolicy);
      expect(update.status).toBe(200);
      expect(update.body).toEqual({
        success: true,
        plan: "registered",
        policy: updatedPolicy,
      });

      const stored = await findPlanPolicyByName("registered");
      expect(JSON.parse(stored.policy_json)).toEqual(updatedPolicy);

      const access = await request(app)
        .get("/api/search-access")
        .set("Authorization", `Bearer ${userToken}`);
      expect(access.status).toBe(200);
      expect(access.body).toEqual({
        success: true,
        plan: "registered",
        policy: updatedPolicy,
      });

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${userToken}`)
        .send(parameters);
      expect(response.status).toBe(200);
      expect(providerSearch).toHaveBeenCalledTimes(5);
      expect(providerSearch.mock.calls.map(([destination]) => destination).sort())
        .toEqual([...destinations].sort());
      expect(providerSearch.mock.calls.every((args) => args[3] === "VIE")).toBe(
        true,
      );

      let results;
      if (endpoint === "/search") {
        expect(response.body.failedRequests).toBe(0);
        results = response.body.results;
      } else {
        expect(response.headers["content-type"]).toMatch(/text\/event-stream/);
        expect(response.text).toContain("event: end\ndata: done\n\n");
        results = response.text
          .split("\n")
          .filter((line) => line.startsWith("data: {"))
          .map((line) => JSON.parse(line.slice(6)));
      }
      expect(results).toHaveLength(5);
      expect(results.map((result) => result.destination.code).sort()).toEqual(
        [...destinations].sort(),
      );
    });
  },
);
