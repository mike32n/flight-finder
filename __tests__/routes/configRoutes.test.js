const request = require("supertest");
const express = require("express");

const configRoutes = require("../../routes/configRoutes");
const config = require("../../config/appConfig");

const app = express();

app.use("/config", configRoutes);

describe("GET /config", () => {
  test("should return public frontend configuration", async () => {
    const response = await request(app).get("/config");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      destinations: {
        maxSelected: config.destinations.maxSelected,
      },
      search: {
        maxNights: config.search.maxNights,
        maxResults: config.search.maxResults,
      },
      auth: {
        emailVerificationRequired: config.auth.emailVerificationRequired,
      },
    });
  });
});
