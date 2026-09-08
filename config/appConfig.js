module.exports = {
  destinations: {
    maxSelected: 3,
  },
  search: {
    weeksToGenerate: 8,
    maxNights: 30,
    maxResults: 5,
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
