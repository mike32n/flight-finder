const crypto = require("crypto");
const redis = require("./redisClient");

const DEFAULT_TTL = Number(process.env.CACHE_TTL) || 600; // 10 perc

const inFlight = new Map();

function generateKey(providerName, payload) {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  return `flight:${providerName}:${hash}`;
}

async function getOrSet(providerName, payload, fetcher) {
  const key = generateKey(providerName, payload);

  // 1️⃣ In-flight dedupe
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = (async () => {
    // 2️⃣ Cache check
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // 3️⃣ Fresh fetch
    const fresh = await fetcher();

    // only cache successful responses
    if (fresh?.success) {
      await redis.set(key, JSON.stringify(fresh), "EX", DEFAULT_TTL);
    }

    return fresh;
  })();

  inFlight.set(key, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

module.exports = {
  getOrSet,
};
