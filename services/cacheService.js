const crypto = require("crypto");
const redis = require("./redisClient");

const PREFIX = "ff:v1";
const DEFAULT_TTL = Number(process.env.CACHE_TTL) || 600; // fallback
const FETCH_TIMEOUT = 10000; // 10s

const inFlight = new Map();

function stableStringify(obj) {
  return JSON.stringify(
    Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = obj[key];
        return acc;
      }, {}),
  );
}

function generateKey(providerName, payload) {
  const hash = crypto
    .createHash("sha256")
    .update(stableStringify(payload))
    .digest("hex");

  return `${PREFIX}:flight:${providerName}:${hash}`;
}

function withTimeout(promise, ms = FETCH_TIMEOUT) {
  let timer;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("timeout"));
    }, ms);

    timer.unref?.();
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

async function set(key, value, ttl = DEFAULT_TTL) {
  await redis.set(key, stableStringify(value), "EX", ttl);
}

async function get(key) {
  const cached = await redis.get(key);
  if (!cached) return null;

  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

async function getOrSet(providerName, payload, fetcher) {
  const key = generateKey(providerName, payload);

  // 1️⃣ In-flight dedupe
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = (async () => {
    // 2️⃣ Cache check
    const cached = await get(key);
    if (cached) return cached;

    // 3️⃣ Fresh fetch (timeout protected)
    let fresh;
    try {
      fresh = await withTimeout(fetcher());
    } catch (err) {
      // timeout vagy fetch error → nem cache-elünk
      throw err;
    }

    // only cache successful responses
    if (fresh?.success) {
      const ttl = fresh.data?.price < 50 ? 1800 : 600;
      await redis.set(key, stableStringify(fresh), "EX", ttl);
    }

    return fresh;
  })();

  inFlight.set(key, promise);

  try {
    return await promise;
  } finally {
    // 🔐 garantált cleanup még timeout esetén is
    inFlight.delete(key);
  }
}

module.exports = {
  getOrSet,
  set,
  get,
};
