const generateTrips = require("../utils/dateGenerator");
const { getProvider } = require("../providers/providerFactory");
const provider = require("../config/providerConfig");
const appConfig = require("../config/appConfig");
const runWithConcurrencyLimit = require("../utils/promisePool");
const { expandControlledFlexibility } = require("./flexDateGenerator");
const { shouldRunFlex, analyzePriceDelta } = require("./smartFlexService");

const flightProvider = getProvider();

async function searchFlights({
  destinations,
  weekday,
  nights,
  flexibility = "none",
  enrichAirport,
}) {
  const trips = generateTrips(weekday, nights);

  // BASE TASKS
  const baseTasks = [];

  for (const destination of destinations) {
    for (const trip of trips) {
      baseTasks.push(() =>
        flightProvider.searchFlights(destination, trip.departure, trip.return),
      );
    }
  }

  // RUN BASE
  const baseResults = await runWithConcurrencyLimit(
    baseTasks,
    provider.concurrency,
  );

  // SMART FLEX
  let flexResults = [];

  if (
    appConfig.smartFlex.enabled &&
    flexibility === "smart" &&
    shouldRunFlex(baseResults)
  ) {
    const flexTasks = [];

    for (const destination of destinations) {
      for (const trip of trips) {
        const variants = expandControlledFlexibility(trip);
        const onlyFlex = variants.slice(1);

        for (const variant of onlyFlex) {
          flexTasks.push(() =>
            flightProvider.searchFlights(
              destination,
              variant.departure,
              variant.return,
            ),
          );
        }
      }
    }

    flexResults = await runWithConcurrencyLimit(
      flexTasks,
      provider.concurrency,
    );
  }

  // MERGE
  const results = [...baseResults, ...flexResults];

  console.log("RAW RESULTS:", JSON.stringify(results, null, 2));

  const successful = results.filter((r) => r.success).map((r) => r.data);

  const unique = new Map();

  for (const item of successful) {
    const key = `${item.destination}-${item.departure}-${item.return}`;

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  const deduped = Array.from(unique.values());

  const enriched = deduped.map((item) => ({
    origin: enrichAirport("BUD"),
    destination: enrichAirport(item.destination),
    departure: item.departure,
    return: item.return,
    price: item.price,
  }));

  enriched.sort((a, b) => a.price - b.price);

  const priceInsight =
    flexibility === "smart"
      ? analyzePriceDelta(baseResults, flexResults)
      : null;

  return {
    results: enriched.slice(0, appConfig.search.maxResults),
    failedRequests: results.filter((r) => !r.success).length,
    priceInsight,
  };
}

async function searchFlightsStream({
  destinations,
  weekday,
  nights,
  flexibility = "none",
  enrichAirport,
  onResult,
}) {
  const trips = generateTrips(weekday, nights);

  const tasks = [];

  for (const destination of destinations) {
    for (const trip of trips) {
      tasks.push(() =>
        flightProvider.searchFlights(destination, trip.departure, trip.return),
      );
    }
  }

  // SMART FLEX EXTENSION
  if (appConfig.smartFlex.enabled && flexibility === "smart") {
    for (const destination of destinations) {
      for (const trip of trips) {
        const variants = expandControlledFlexibility(trip);
        const onlyFlex = variants.slice(1);

        for (const variant of onlyFlex) {
          tasks.push(() =>
            flightProvider.searchFlights(
              destination,
              variant.departure,
              variant.return,
            ),
          );
        }
      }
    }
  }

  const sentKeys = new Set();

  await runWithConcurrencyLimit(tasks, provider.concurrency, (result) => {
    console.log("STREAM RESULT:", JSON.stringify(result, null, 2));

    if (!result.success) {
      onResult({
        type: "fail",
      });

      return;
    }

    const item = result.data;
    const key = `${item.destination}-${item.departure}-${item.return}`;

    if (sentKeys.has(key)) return;

    sentKeys.add(key);

    const enriched = {
      ...item,
      origin: enrichAirport("BUD"),
      destination: enrichAirport(item.destination),
    };

    onResult({
      type: "data",
      data: enriched,
    });
  });
}

module.exports = {
  searchFlights,
  searchFlightsStream,
};
