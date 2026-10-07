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

function createBaseTasks(destinations, trips) {
  const tasks = [];

  for (const destination of destinations) {
    for (const trip of trips) {
      tasks.push(() =>
        flightProvider.searchFlights(destination, trip.departure, trip.return),
      );
    }
  }

  return tasks;
}

function createFlexTasks(destinations, trips) {
  const tasks = [];

  for (const destination of destinations) {
    for (const trip of trips) {
      const variants = expandControlledFlexibility(trip);
      const onlyFlex = variants.slice(1);

      for (const variant of onlyFlex) {
        tasks.push(async () => {
          const result = await flightProvider.searchFlights(
            destination,
            variant.departure,
            variant.return,
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

function enrichFlightResult(item, enrichAirport) {
  return {
    ...item,
    origin: enrichAirport("BUD"),
    destination: enrichAirport(item.destination),
  };
}

async function searchFlights({ destinations, weekday, nights, enrichAirport }) {
  const trips = generateTrips(weekday, nights);

  const baseTasks = createBaseTasks(destinations, trips);

  // RUN BASE
  const baseResults = await runWithConcurrencyLimit(
    baseTasks,
    provider.concurrency,
  );

  // SMART FLEX / FALLBACK FLEX
  let flexResults = [];

  const isFallbackFlex =
    !appConfig.smartFlex.enabled && shouldRunFallbackFlex(baseResults);

  const shouldSearchFlex = appConfig.smartFlex.enabled || isFallbackFlex;

  if (shouldSearchFlex) {
    const flexTasks = createFlexTasks(destinations, trips);

    flexResults = await runWithConcurrencyLimit(
      flexTasks,
      provider.concurrency,
    );
  }

  // MERGE
  const filteredFlexResults = isFallbackFlex
    ? flexResults
    : flexResults.filter((result) => analyzeFlexResult(baseResults, result));

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
    const key = `${item.destination}-${item.departure}-${item.return}`;

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  const deduped = Array.from(unique.values());

  const enriched = deduped.map((item) =>
    enrichFlightResult(item, enrichAirport),
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
  destinations,
  weekday,
  nights,
  enrichAirport,
  onResult,
}) {
  const trips = generateTrips(weekday, nights);

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
    const key = `${item.destination}-${item.departure}-${item.return}`;

    if (sentKeys.has(key)) return;

    const enriched = {
      ...enrichFlightResult(item, enrichAirport),
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
  const baseTasks = createBaseTasks(destinations, trips);

  const baseResults = await runWithConcurrencyLimit(
    baseTasks,
    provider.concurrency,
    (result) => handleResult(result, "base"),
  );

  // SMART FLEX / FALLBACK FLEX
  const isFallbackFlex =
    !appConfig.smartFlex.enabled && shouldRunFallbackFlex(baseResults);

  const shouldSearchFlex = appConfig.smartFlex.enabled || isFallbackFlex;

  if (shouldSearchFlex) {
    const flexTasks = createFlexTasks(destinations, trips);

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
