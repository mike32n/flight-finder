const express = require("express");
const generateTrips = require("../dateGenerator");
const { getProvider } = require("../providers/providerFactory");
const { getProviderConfig } = require("../config/providers");
const runWithConcurrencyLimit = require("../promisePool");
const validateSearch = require("../middlewares/validateSearch");
const { getAllDestinations } = require("../models/destinationModel");
const { expandControlledFlexibility } = require("../dateFlexibility");
const {
  shouldRunFlex,
  analyzePriceDelta,
} = require("../services/smartFlexService");

const router = express.Router();
const flightProvider = getProvider();
const config = getProviderConfig();

router.get("/destinations", async (req, res) => {
  try {
    const destinations = await getAllDestinations();

    res.json(
      destinations.map((d) => ({
        label: d.city_name,
        value: d.iata_code,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

router.post("/search", validateSearch, async (req, res) => {
  try {
    const { destinations, weekday, nights, flexibility = "none" } = req.body;

    const trips = generateTrips(weekday, nights);

    // 1️⃣ BASE TASKS (NO FLEX)
    const baseTasks = [];

    for (const destination of destinations) {
      for (const trip of trips) {
        baseTasks.push(() =>
          flightProvider.searchFlights(
            destination,
            trip.departure,
            trip.return,
          ),
        );
      }
    }

    // 2️⃣ RUN BASE
    const baseResults = await runWithConcurrencyLimit(
      baseTasks,
      config.concurrency,
    );

    // 3️⃣ SMART FLEX DECISION
    let flexResults = [];

    if (flexibility === "smart" && shouldRunFlex(baseResults)) {
      const flexTasks = [];

      for (const destination of destinations) {
        for (const trip of trips) {
          const variants = expandControlledFlexibility(trip);

          // ❗ skip original (already queried)
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
        config.concurrency,
      );
    }

    // 4️⃣ MERGE RESULTS
    const results = [...baseResults, ...flexResults];

    console.log("RAW RESULTS:", JSON.stringify(results, null, 2));

    const successful = results.filter((r) => r.success).map((r) => r.data);

    successful.sort((a, b) => a.price - b.price);

    const unique = new Map();

    for (const item of successful) {
      const key = `${item.destination}-${item.departure}-${item.return}`;
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    }

    const deduped = Array.from(unique.values());

    deduped.sort((a, b) => a.price - b.price);

    const priceInsight =
      flexibility === "smart"
        ? analyzePriceDelta(baseResults, flexResults)
        : null;

    return res.json({
      results: deduped.slice(0, 5),
      failedRequests: results.filter((r) => !r.success).length,
      priceInsight,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
