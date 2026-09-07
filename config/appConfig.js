module.exports = {
  search: {
    maxResults: 5,
    concurrency: 5,
  },
  destinations: {
    maxSelected: 3,
  },
  dateGenerator: {
    weeksToGenerate: 8,
  },
  smartFlex: {
    triggerMultiplier: 1.1,
    departureShiftDays: 1,
    returnShiftDays: 1,
  },
  cache: {
    ttlSeconds: 3600,
  },
};
