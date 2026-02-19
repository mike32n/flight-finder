const cache = require("../services/cacheService");

describe("cacheService", () => {
  test("set and get value", async () => {
    await cache.set("test-key", { a: 1 }, 10);
    const value = await cache.get("test-key");

    expect(value).toEqual({ a: 1 });
  });

  test("returns null for missing key", async () => {
    const value = await cache.get("non-existent");
    expect(value).toBeNull();
  });
});
