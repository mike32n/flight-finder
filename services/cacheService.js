const crypto = require("crypto");
const redis = require("./redisClient");
const appConfig = require("../config/appConfig");

const PREFIX = "ff:v1";
const CACHE_TTL = appConfig.cache.ttlSeconds || 600; // fallback
const FETCH_TIMEOUT = appConfig.api.timeoutMs || 10000;
const CACHE_TIMEOUT = appConfig.cache.operationTimeoutMs ?? 1000;

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

function withTimeout(promise, ms = FETCH_TIMEOUT, abortController) {
  let timer;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("timeout");

      reject(error);
      abortController?.abort(error);
    }, ms);

    timer.unref?.();
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

async function set(key, value, ttl = CACHE_TTL) {
  await withTimeout(
    redis.set(key, stableStringify(value), "EX", ttl),
    CACHE_TIMEOUT,
  );
}

async function get(key) {
  const cached = await withTimeout(redis.get(key), CACHE_TIMEOUT);
  if (!cached) return null;

  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

async function getOrSet(
  providerName,
  payload,
  fetcher,
  { normalize = (value) => value } = {},
) {
  const key = generateKey(providerName, payload);

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = (async () => {
    let cached = null;

    try {
      cached = await get(key);
    } catch (error) {
      console.warn("Flight cache read failed:", error.message);
    }

    if (cached) {
      const normalized = normalize(cached);

      if (normalized?.success === true) {
        return normalized;
      }
    }

    const controller = new AbortController();

    const fetched = await withTimeout(
      Promise.resolve().then(() => fetcher(controller.signal)),
      FETCH_TIMEOUT,
      controller,
    );

    const fresh = normalize(fetched);

    if (fresh?.success === true) {
      try {
        await set(key, fresh);
      } catch (error) {
        console.warn("Flight cache write failed:", error.message);
      }
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
  set,
  get,
};
