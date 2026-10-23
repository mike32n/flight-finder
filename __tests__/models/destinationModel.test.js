process.env.DB_PATH = ":memory:";

const { getDb, initDb, closeDb } = require("../../db");
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

  test("should return destinations with city name, IATA code and airport name", async () => {
    const destinations = await getAllDestinations();

    expect(destinations[0]).toEqual(
      expect.objectContaining({
        city_name: expect.any(String),
        iata_code: expect.any(String),
        airport_name: expect.any(String),
      }),
    );
  });

  test("filters stored airports outside the supported catalog", async () => {
    await new Promise((resolve, reject) => {
      getDb().run(
        `INSERT INTO destinations (city_name, iata_code, airport_name)
       VALUES (?, ?, ?)`,
        ["Retired city", "XXX", "Retired airport"],
        (error) => {
          if (error) return reject(error);
          resolve();
        },
      );
    });

    const destinations = await getAllDestinations();

    expect(destinations.length).toBeGreaterThan(0);

    expect(destinations.some(({ iata_code }) => iata_code === "XXX")).toBe(
      false,
    );
  });
});
