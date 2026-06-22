jest.mock("../services/redisClient", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  quit: jest.fn().mockResolvedValue("OK"),
  on: jest.fn(),
  defineCommand: jest.fn(),
}));

jest.mock("../services/rateLimiter", () => ({
  acquireToken: jest.fn().mockResolvedValue(true),
}));

jest.mock("../db", () => ({
  getDb: jest.fn(() => ({
    all: jest.fn((_, __, cb) => cb(null, [])),
  })),
  closeDb: jest.fn().mockResolvedValue(),
}));

const request = require("supertest");
const app = require("../app");

describe("POST /search", () => {
  test("returns 400 if parameters missing", async () => {
    const response = await request(app).post("/search").send({});

    expect(response.statusCode).toBe(400);
  });

  test("returns results for valid request", async () => {
    const response = await request(app)
      .post("/search")
      .send({
        destinations: ["BCN"],
        weekday: 2,
        nights: 3,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.results).toBeDefined();
  });

  test("returns 400 if destinations is empty", async () => {
    const response = await request(app).post("/search").send({
      destinations: [],
      weekday: 2,
      nights: 3,
    });

    expect(response.statusCode).toBe(400);
  });

  test("returns 400 if weekday invalid", async () => {
    const response = await request(app)
      .post("/search")
      .send({
        destinations: ["BCN"],
        weekday: 9,
        nights: 3,
      });

    expect(response.statusCode).toBe(400);
  });

  test("handles partial failures", async () => {
    const response = await request(app)
      .post("/search")
      .send({
        destinations: ["INVALID1", "BCN"],
        weekday: 2,
        nights: 3,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.failedRequests).toBeGreaterThanOrEqual(0);
  });
});

afterAll(async () => {
  const redis = require("../services/redisClient");
  const { closeDb } = require("../db");

  await closeDb();

  if (redis.quit) {
    await redis.quit();
  }

  await new Promise((r) => setTimeout(r, 50)); // 👈 flush event loop
});
