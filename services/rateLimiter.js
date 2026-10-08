const crypto = require("crypto");
const redis = require("./redisClient");
const appConfig = require("../config/appConfig");

/**
 * Sliding window rate limiter (atomic, Lua)
 *
 * KEYS[1] = rate limit key
 * ARGV[1] = now (ms)
 * ARGV[2] = window (ms)
 * ARGV[3] = limit (number)
 */
const rateLimitScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local requestId = ARGV[4]

-- remove old entries
redis.call("ZREMRANGEBYSCORE", key, 0, now - window)

local count = redis.call("ZCARD", key)

if count >= limit then
  return 0
end

-- add current request
redis.call("ZADD", key, now, requestId)

-- set expiration in seconds
redis.call("EXPIRE", key, math.ceil(window / 1000))

return 1
`;

// Define once (ioredis caches the SHA internally)
redis.defineCommand("acquireToken", {
  numberOfKeys: 1,
  lua: rateLimitScript,
});

async function acquireToken(providerName, limit, windowSeconds) {
  const key = `ratelimit:${providerName}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const requestId = `${now}-${crypto.randomUUID()}`;

  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Rate limiter Redis timeout"));
    }, appConfig.cache.operationTimeoutMs ?? 1000);

    timer.unref?.();
  });

  try {
    const result = await Promise.race([
      redis.acquireToken(key, now, windowMs, limit, requestId),
      timeout,
    ]);

    return result === 1;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { acquireToken };
