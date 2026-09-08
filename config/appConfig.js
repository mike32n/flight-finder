module.exports = {
  search: {
    weeksToGenerate: 8,
    maxResults: 5,
    concurrency: 5,
  },
  destinations: {
    maxSelected: 3,
  },
  smartFlex: {
    enabled: true,
    triggerMultiplier: 1.1,
    departureShiftDays: 1,
    returnShiftDays: 1,
  },
  cache: {
    ttlSeconds: 3600,
  },
  api: {
    timeoutMs: 15000,
  },
};
