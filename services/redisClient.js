const RedisModule = require("ioredis");
const Redis = RedisModule.default || RedisModule;

let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,

      // 🔁 Retry strategy (progressive backoff, max 2s)
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },

      // 🔐 Environment prefix (multi-env safe)
      keyPrefix: process.env.REDIS_PREFIX || "ff:dev:",

      // Stability options
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,

      // Optional: don't auto-connect immediately
      lazyConnect: true,
    });

    // Connection lifecycle events
    redis.on("connect", () => console.log("Redis connecting..."));
    redis.on("ready", () => console.log("Redis ready ✅"));
    redis.on("error", (err) => console.error("Redis error:", err));
    redis.on("close", () => console.warn("Redis connection closed"));
    redis.on("reconnecting", (d) =>
      console.warn(`Redis reconnecting in ${d}ms...`),
    );
  }

  return redis;
}

module.exports = getRedis(); // 👈 singleton instance
module.exports.getRedis = getRedis; // optional
