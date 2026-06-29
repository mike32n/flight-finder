const redis = require("../services/redisClient");

jest.mock("../services/redisClient", () => {
  let store = {};

  return {
    get: jest.fn((key) => Promise.resolve(store[key] || null)),

    set: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve("OK");
    }),

    __reset: () => {
      store = {};
    },

    __store: () => store,
  };
});

const cache = require("../services/cacheService");

describe("cacheService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis.__reset();
  });

  describe("get()", () => {
    test("returns stored object", async () => {
      await cache.set("test-key", { a: 1 }, 10);

      const value = await cache.get("test-key");

      expect(value).toEqual({ a: 1 });
    });

    test("returns null for missing key", async () => {
      const value = await cache.get("missing");

      expect(value).toBeNull();
    });

    test("returns null for invalid JSON", async () => {
      redis.get.mockResolvedValueOnce("{invalid-json");

      const value = await cache.get("broken");

      expect(value).toBeNull();
    });
  });

  describe("set()", () => {
    test("serializes object before storing", async () => {
      await cache.set("test", { hello: "world" }, 60);

      expect(redis.set).toHaveBeenCalledTimes(1);

      expect(redis.set.mock.calls[0][0]).toBe("test");
      expect(redis.set.mock.calls[0][1]).toBe(
        JSON.stringify({ hello: "world" }),
      );
      expect(redis.set.mock.calls[0][2]).toBe("EX");
      expect(redis.set.mock.calls[0][3]).toBe(60);
    });
  });

  describe("getOrSet()", () => {
    const provider = "mock";
    const payload = {
      destination: "BCN",
      departure: "2026-07-01",
    };

    test("returns cached value on cache hit", async () => {
      const cached = {
        success: true,
        data: { price: 123 },
      };

      redis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const fetcher = jest.fn();

      const result = await cache.getOrSet(provider, payload, fetcher);

      expect(fetcher).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    test("calls fetcher on cache miss", async () => {
      redis.get.mockResolvedValueOnce(null);

      const fresh = {
        success: true,
        data: { price: 100 },
      };

      const fetcher = jest.fn().mockResolvedValue(fresh);

      const result = await cache.getOrSet(provider, payload, fetcher);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result).toEqual(fresh);
    });

    test("caches successful response", async () => {
      redis.get.mockResolvedValueOnce(null);

      const fetcher = jest.fn().mockResolvedValue({
        success: true,
        data: { price: 100 },
      });

      await cache.getOrSet(provider, payload, fetcher);

      expect(redis.set).toHaveBeenCalledTimes(1);
    });

    test("does not cache unsuccessful response", async () => {
      redis.get.mockResolvedValueOnce(null);

      const fetcher = jest.fn().mockResolvedValue({
        success: false,
        error: "API failure",
      });

      await cache.getOrSet(provider, payload, fetcher);

      expect(redis.set).not.toHaveBeenCalled();
    });

    test("propagates fetcher errors", async () => {
      redis.get.mockResolvedValueOnce(null);

      const fetcher = jest.fn().mockRejectedValue(new Error("boom"));

      await expect(cache.getOrSet(provider, payload, fetcher)).rejects.toThrow(
        "boom",
      );
    });

    test("deduplicates concurrent requests", async () => {
      redis.get.mockResolvedValue(null);

      const fetcher = jest.fn(
        async () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: {
                    price: 222,
                  },
                }),
              20,
            ),
          ),
      );

      const [r1, r2] = await Promise.all([
        cache.getOrSet(provider, payload, fetcher),
        cache.getOrSet(provider, payload, fetcher),
      ]);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r1).toEqual(r2);
    });

    test("uses long ttl for cheap flights", async () => {
      redis.get.mockResolvedValueOnce(null);

      const fetcher = jest.fn().mockResolvedValue({
        success: true,
        data: {
          price: 40,
        },
      });

      await cache.getOrSet(provider, payload, fetcher);

      expect(redis.set.mock.calls[0][3]).toBe(1800);
    });

    test("uses default ttl for regular flights", async () => {
      redis.get.mockResolvedValueOnce(null);

      const fetcher = jest.fn().mockResolvedValue({
        success: true,
        data: {
          price: 100,
        },
      });

      await cache.getOrSet(provider, payload, fetcher);

      expect(redis.set.mock.calls[0][3]).toBe(600);
    });
  });
});
