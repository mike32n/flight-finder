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
  updateSmartFlexPreference,
} = require("../../models/userModel");
const {
  getPlanPolicy,
  updatePlanPolicy,
} = require("../../services/planPolicyService");
const { router } = require("../../routes/searchRoutes");
const providerSearch = getProvider().searchFlights;

const app = express();
app.use(express.json());
app.use("/", router);

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
      providerSearch.mockReset().mockImplementation(
        async (destination, departure, returnDate) => ({
          success: true,
          data: {
            destination,
            departure,
            return: returnDate,
            price: 30000,
            currency: "HUF",
          },
        }),
      );
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
      expect(await updateSmartFlexPreference(offUser.id, false)).toBe(true);

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
  },
);
