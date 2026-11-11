process.env.DB_PATH = ":memory:";

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { getDb, initDb, closeDb } = require("../../db");
const { createUser, findUserById } = require("../../models/userModel");
const authRoutes = require("../../routes/authRoutes");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

function runSql(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, parameters, (error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
}

describe("current user preference persistence", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret";
    await initDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  test("persists both preference values independently for authenticated users", async () => {
    const first = await createUser({
      email: "first-me@example.com",
      passwordHash: "hash",
      verificationToken: null,
    });
    const second = await createUser({
      email: "second-me@example.com",
      passwordHash: "hash",
      verificationToken: null,
    });
    const firstToken = jwt.sign({ userId: first.id }, process.env.JWT_SECRET);
    const secondToken = jwt.sign({ userId: second.id }, process.env.JWT_SECRET);

    const firstUpdate = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        smartFlexPreference: false,
        expectedSmartFlexPreferenceVersion: 0,
      });
    expect(firstUpdate.status).toBe(200);
    expect(firstUpdate.body.smartFlexPreference).toBe(false);
    expect(firstUpdate.body.smartFlexPreferenceVersion).toBe(1);

    const firstRead = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${firstToken}`);
    const secondRead = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${secondToken}`);
    expect(firstRead.body.user.smartFlexPreference).toBe(false);
    expect(secondRead.body.user.smartFlexPreference).toBe(true);
    expect(firstRead.body.user.smartFlexPreferenceVersion).toBe(1);
    expect(secondRead.body.user.smartFlexPreferenceVersion).toBe(0);

    const secondUpdate = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${secondToken}`)
      .send({
        smartFlexPreference: false,
        expectedSmartFlexPreferenceVersion: 0,
      });
    expect(secondUpdate.status).toBe(200);

    const firstRestore = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        smartFlexPreference: true,
        expectedSmartFlexPreferenceVersion: 1,
      });
    expect(firstRestore.status).toBe(200);
    expect(firstRestore.body.smartFlexPreference).toBe(true);
    expect(firstRestore.body.smartFlexPreferenceVersion).toBe(2);

    await runSql(
      `
        UPDATE users
        SET smart_flex_preference_version = ?
        WHERE id = ?
      `,
      [4, first.id],
    );

    const firstRestoredRead = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${firstToken}`);
    const secondUpdatedRead = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${secondToken}`);
    expect(firstRestoredRead.body.user.smartFlexPreference).toBe(true);
    expect(firstRestoredRead.body.user.smartFlexPreferenceVersion).toBe(4);
    expect(secondUpdatedRead.body.user.smartFlexPreference).toBe(false);
  });

  test("returns a conflict without overwriting the first update", async () => {
    const created = await createUser({
      email: "conflict-me@example.com",
      passwordHash: "hash",
      verificationToken: null,
    });
    const token = jwt.sign({ userId: created.id }, process.env.JWT_SECRET);

    const first = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        smartFlexPreference: false,
        expectedSmartFlexPreferenceVersion: 0,
      });
    const stale = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        smartFlexPreference: true,
        expectedSmartFlexPreferenceVersion: 0,
      });
    const current = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(first.status).toBe(200);
    expect(first.body.smartFlexPreferenceVersion).toBe(1);
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe("SMART_FLEX_PREFERENCE_VERSION_CONFLICT");
    expect(current.body.user).toEqual(
      expect.objectContaining({
        smartFlexPreference: false,
        smartFlexPreferenceVersion: 1,
      }),
    );
  });

  test("allows exactly one concurrent update for the same version", async () => {
    const created = await createUser({
      email: "concurrent-conflict-me@example.com",
      passwordHash: "hash",
      verificationToken: null,
    });
    const token = jwt.sign({ userId: created.id }, process.env.JWT_SECRET);
    const preferences = [false, true];

    const responses = await Promise.all(
      preferences.map((smartFlexPreference) =>
        request(app)
          .patch("/api/auth/me")
          .set("Authorization", `Bearer ${token}`)
          .send({
            smartFlexPreference,
            expectedSmartFlexPreferenceVersion: 0,
          }),
      ),
    );
    const successfulResponses = responses.filter(
      (response) => response.status === 200,
    );
    const conflictingResponses = responses.filter(
      (response) => response.status === 409,
    );
    const successfulResponse = successfulResponses[0];
    const persistedUser = await findUserById(created.id);
    const losingPreference = preferences[
      responses.findIndex((response) => response.status === 409)
    ];

    expect(successfulResponses).toHaveLength(1);
    expect(conflictingResponses).toHaveLength(1);
    expect(successfulResponse.body.smartFlexPreferenceVersion).toBe(1);
    expect(persistedUser.smart_flex_preference_version).toBe(1);
    expect(persistedUser.smart_flex_preference).toBe(
      successfulResponse.body.smartFlexPreference,
    );
    expect(persistedUser.smart_flex_preference).not.toBe(losingPreference);
  });
});
