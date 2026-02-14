const request = require("supertest");
const app = require("../app");

describe("POST /search", () => {
  test("returns 400 if parameters missing", async () => {
    const response = await request(app)
      .post("/search")
      .send({});

    expect(response.statusCode).toBe(400);
  });

  test("returns results for valid request", async () => {
    const response = await request(app)
      .post("/search")
      .send({
        destinations: ["BCN"],
        weekday: 2,
        nights: 3
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.results).toBeDefined();
  });
});
