const express = require("express");
const generateTrips = require("../dateGenerator");
const { getProvider } = require("../providers/providerFactory");
const { getProviderConfig } = require("../config/providers");
const runWithConcurrencyLimit = require("../promisePool");
const validateSearch = require("../middlewares/validateSearch");
const { getAllDestinations } = require("../models/destinationModel");

const router = express.Router();
const flightProvider = getProvider();
const config = getProviderConfig();

router.get("/destinations", async (req, res) => {
  try {
    const destinations = await getAllDestinations();

    res.json(
      destinations.map(d => ({
        label: d.city_name,
        value: d.iata_code
      }))
    );

  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

router.post("/search", validateSearch, async (req, res) => {
  try {
    const { destinations, weekday, nights } = req.body;

    const trips = generateTrips(weekday, nights);
    const tasks = [];

    for (const destination of destinations) {
      for (const trip of trips) {
        tasks.push(() =>
          flightProvider.searchFlights(
            destination,
            trip.departure,
            trip.return,
          ),
        );
      }
    }

    const results = await runWithConcurrencyLimit(tasks, config.concurrency);

    console.log("RAW RESULTS:", JSON.stringify(results, null, 2));

    const successful = results.filter((r) => r.success).map((r) => r.data);

    successful.sort((a, b) => a.price - b.price);

    res.json({
      results: successful.slice(0, 5),
      failedRequests: results.filter((r) => !r.success).length,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
