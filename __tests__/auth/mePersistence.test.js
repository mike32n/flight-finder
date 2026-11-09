process.env.DB_PATH = ":memory:";

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { initDb, closeDb } = require("../../db");
const { createUser } = require("../../models/userModel");
const authRoutes = require("../../routes/authRoutes");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

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
      .send({ smartFlexPreference: false });
    expect(firstUpdate.status).toBe(200);
    expect(firstUpdate.body.smartFlexPreference).toBe(false);

    const firstRead = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${firstToken}`);
    const secondRead = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${secondToken}`);
    expect(firstRead.body.user.smartFlexPreference).toBe(false);
    expect(secondRead.body.user.smartFlexPreference).toBe(true);

    const secondUpdate = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${secondToken}`)
      .send({ smartFlexPreference: false });
    expect(secondUpdate.status).toBe(200);

    const firstRestore = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({ smartFlexPreference: true });
    expect(firstRestore.status).toBe(200);
    expect(firstRestore.body.smartFlexPreference).toBe(true);

    const firstRestoredRead = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${firstToken}`);
    const secondUpdatedRead = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${secondToken}`);
    expect(firstRestoredRead.body.user.smartFlexPreference).toBe(true);
    expect(secondUpdatedRead.body.user.smartFlexPreference).toBe(false);
  });
});
