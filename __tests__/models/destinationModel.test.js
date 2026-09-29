process.env.DB_PATH = ":memory:";

const { initDb, closeDb } = require("../../db");
const { getAllDestinations } = require("../../models/destinationModel");

describe("destinationModel", () => {
  beforeAll(async () => {
    await initDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  test("should return all destinations", async () => {
    const destinations = await getAllDestinations();

    expect(Array.isArray(destinations)).toBe(true);
    expect(destinations.length).toBeGreaterThan(0);
  });

  test("should return destinations with city name and IATA code", async () => {
    const destinations = await getAllDestinations();

    expect(destinations[0]).toEqual(
      expect.objectContaining({
        city_name: expect.any(String),
        iata_code: expect.any(String),
      }),
    );
  });
});
