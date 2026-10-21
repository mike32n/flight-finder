const generateTrips = require("../utils/dateGenerator");
const { getProvider } = require("../providers/providerFactory");
const provider = require("../config/providerConfig");
const appConfig = require("../config/appConfig");
const runWithConcurrencyLimit = require("../utils/promisePool");
const { expandControlledFlexibility } = require("./flexDateGenerator");
const {
  shouldRunFallbackFlex,
  analyzeFlexResult,
} = require("./smartFlexService");

const flightProvider = getProvider();

function createBaseTasks(destinations, trips, origin) {
  const tasks = [];

  for (const destination of destinations) {
    for (const trip of trips) {
      tasks.push(() =>
        flightProvider.searchFlights(
          destination,
          trip.departure,
          trip.return,
          origin,
        ),
      );
    }
  }

  return tasks;
}

function createFlexTasks(destinations, trips, origin, startDate) {
  const tasks = [];

  for (const destination of destinations) {
    for (const trip of trips) {
      const variants = expandControlledFlexibility(trip);
      const onlyFlex = variants
        .slice(1)
        .filter((variant) => !startDate || variant.departure >= startDate);

      for (const variant of onlyFlex) {
        tasks.push(async () => {
          const result = await flightProvider.searchFlights(
            destination,
            variant.departure,
            variant.return,
            origin,
          );

          if (!result.success || !result.data) {
            return result;
          }

          return {
            ...result,
            data: {
              ...result.data,
              baseDeparture: trip.departure,
              baseReturn: trip.return,
            },
          };
        });
      }
    }
  }

  return tasks;
}

function enrichFlightResult(item, enrichAirport, origin) {
  return {
    ...item,
    origin: enrichAirport(origin),
    destination: enrichAirport(item.destination),
  };
}

async function searchFlights({
  origin = appConfig.departureAirports.default,
  destinations,
  weekday,
  nights,
  startDate,
  allowFlexSearch = true,
  enrichAirport,
}) {
  const trips = generateTrips(
    weekday,
    nights,
    appConfig.search.weeksToGenerate,
    startDate,
  );

  const baseTasks = createBaseTasks(destinations, trips, origin);

  // RUN BASE
  const baseResults = await runWithConcurrencyLimit(
    baseTasks,
    provider.concurrency,
  );

  // SMART FLEX / FALLBACK FLEX
  let flexResults = [];

  const isFallbackFlex =
    allowFlexSearch &&
    !appConfig.smartFlex.enabled &&
    shouldRunFallbackFlex(baseResults);

  const shouldSearchFlex =
    allowFlexSearch && (appConfig.smartFlex.enabled || isFallbackFlex);

  if (shouldSearchFlex) {
    const flexTasks = createFlexTasks(destinations, trips, origin, startDate);

    flexResults = await runWithConcurrencyLimit(
      flexTasks,
      provider.concurrency,
    );
  }

  // MERGE
  const filteredFlexResults = isFallbackFlex
    ? flexResults
    : flexResults
        .map((result) => {
          const priceInsight = analyzeFlexResult(baseResults, result);

          if (!priceInsight) return null;

          return {
            ...result,
            data: {
              ...result.data,
              priceInsight,
            },
          };
        })
        .filter((result) => result !== null);

  const results = [
    ...baseResults.map((result) => ({
      ...result,
      resultType: "base",
    })),
    ...filteredFlexResults.map((result) => ({
      ...result,
      resultType: isFallbackFlex ? "fallback-flex" : "flex",
    })),
  ];

  const successful = results
    .filter((r) => r.success)
    .map((r) => ({
      ...r.data,
      resultType: r.resultType,
    }));

  const unique = new Map();

  for (const item of successful) {
    const key = `${origin}-${item.destination}-${item.departure}-${item.return}`;

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  const deduped = Array.from(unique.values());

  const enriched = deduped.map((item) =>
    enrichFlightResult(item, enrichAirport, origin),
  );

  enriched.sort((a, b) => a.price - b.price);

  return {
    results: enriched.slice(0, appConfig.search.maxResults),
    failedRequests: [...baseResults, ...flexResults].filter(
      (r) => !r.success && r.reason === "provider_error",
    ).length,
  };
}

async function searchFlightsStream({
  origin = appConfig.departureAirports.default,
  destinations,
  weekday,
  nights,
  startDate,
  allowFlexSearch = true,
  enrichAirport,
  onResult,
}) {
  const trips = generateTrips(
    weekday,
    nights,
    appConfig.search.weeksToGenerate,
    startDate,
  );

  const sentKeys = new Set();

  function handleResult(result, resultType, baseResults = []) {
    if (!result.success) {
      if (result.reason === "provider_error") {
        onResult({
          type: "fail",
        });
      }

      return;
    }

    const item = result.data;
    const key = `${origin}-${item.destination}-${item.departure}-${item.return}`;

    if (sentKeys.has(key)) return;

    const enriched = {
      ...enrichFlightResult(item, enrichAirport, origin),
      resultType,
    };

    if (resultType === "flex") {
      const priceInsight = analyzeFlexResult(baseResults, result);

      if (!priceInsight) return;

      enriched.priceInsight = priceInsight;
    }

    sentKeys.add(key);

    onResult({
      type: "data",
      data: enriched,
    });
  }

  // BASE SEARCH
  const baseTasks = createBaseTasks(destinations, trips, origin);

  const baseResults = await runWithConcurrencyLimit(
    baseTasks,
    provider.concurrency,
    (result) => handleResult(result, "base"),
  );

  // SMART FLEX / FALLBACK FLEX
  const isFallbackFlex =
    allowFlexSearch &&
    !appConfig.smartFlex.enabled &&
    shouldRunFallbackFlex(baseResults);

  const shouldSearchFlex =
    allowFlexSearch && (appConfig.smartFlex.enabled || isFallbackFlex);

  if (shouldSearchFlex) {
    const flexTasks = createFlexTasks(destinations, trips, origin, startDate);

    const flexResultType = isFallbackFlex ? "fallback-flex" : "flex";

    await runWithConcurrencyLimit(flexTasks, provider.concurrency, (result) =>
      handleResult(result, flexResultType, baseResults),
    );
  }
}

module.exports = {
  searchFlights,
  searchFlightsStream,
};
