const redis = require("./redisClient");

async function acquireToken(providerName, limit, windowSeconds) {
  const key = `ratelimit:${providerName}`;
  const now = Date.now();

  const tx = redis.multi();

  tx.zremrangebyscore(key, 0, now - windowSeconds * 1000);
  tx.zcard(key);
  tx.zadd(key, now, now);
  tx.expire(key, windowSeconds);

  const [, count] = await tx.exec();

  if (count[1] >= limit) {
    return false;
  }

  return true;
}

module.exports = { acquireToken };
