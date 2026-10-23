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

async function executeSearch(
  {
    origin = appConfig.departureAirports.default,
    destinations,
    weekday,
    nights,
    startDate,
    allowFlexSearch = true,
    enrichAirport,
    signal,
  },
  onResult,
) {
  signal?.throwIfAborted();

  const trips = generateTrips(
    weekday,
    nights,
    appConfig.search.weeksToGenerate,
    startDate,
  );

  const unique = new Map();
  let failedRequests = 0;

  function handleResult(result, resultType, baseResults) {
    signal?.throwIfAborted();

    if (!result.success) {
      if (result.reason === "provider_error") {
        failedRequests++;
        onResult?.({ type: "fail" });
      }

      return;
    }

    const item = result.data;
    const key = `${origin}-${item.destination}-${item.departure}-${item.return}`;

    if (unique.has(key)) return;

    const priceInsight =
      resultType === "flex" ? analyzeFlexResult(baseResults, result) : null;

    if (resultType === "flex" && !priceInsight) return;

    const enriched = {
      ...enrichFlightResult(item, enrichAirport, origin),
      resultType,
      ...(priceInsight ? { priceInsight } : {}),
    };

    unique.set(key, enriched);
    onResult?.({ type: "data", data: enriched });
  }

  async function runStage(tasks, resultType, baseResults = []) {
    signal?.throwIfAborted();

    const handle = (result) => handleResult(result, resultType, baseResults);

    const results = await runWithConcurrencyLimit(
      tasks,
      provider.concurrency,
      onResult ? handle : undefined,
      { signal },
    );

    signal?.throwIfAborted();

    if (!onResult) {
      results.forEach(handle);
    }

    return results;
  }

  const baseResults = await runStage(
    createBaseTasks(destinations, trips, origin),
    "base",
  );

  const isFallbackFlex =
    allowFlexSearch &&
    !appConfig.smartFlex.enabled &&
    shouldRunFallbackFlex(baseResults);

  const shouldSearchFlex =
    allowFlexSearch && (appConfig.smartFlex.enabled || isFallbackFlex);

  if (shouldSearchFlex) {
    await runStage(
      createFlexTasks(destinations, trips, origin, startDate),
      isFallbackFlex ? "fallback-flex" : "flex",
      baseResults,
    );
  }

  signal?.throwIfAborted();

  return {
    results: Array.from(unique.values()),
    failedRequests,
  };
}

async function searchFlights(options) {
  const result = await executeSearch(options);

  return {
    ...result,
    results: result.results
      .sort((a, b) => a.price - b.price)
      .slice(0, appConfig.search.maxResults),
  };
}

async function searchFlightsStream(options) {
  await executeSearch(options, options.onResult);
}

module.exports = {
  searchFlights,
  searchFlightsStream,
};
