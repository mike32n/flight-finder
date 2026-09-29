const generateTrips = require("../utils/dateGenerator");
const { getProvider } = require("../providers/providerFactory");
const provider = require("../config/providerConfig");
const appConfig = require("../config/appConfig");
const runWithConcurrencyLimit = require("../utils/promisePool");
const { getAllDestinations } = require("../models/destinationModel");
const {
  expandControlledFlexibility,
} = require("../services/flexDateGenerator");
const { searchFlights } = require("../services/flightSearchService");

const flightProvider = getProvider();

// CACHE
let destinationsList = [];
let destinationMap = new Map();

// LOAD ON START
async function initDestinations() {
  destinationsList = await getAllDestinations();

  // build map AFTER data arrives
  destinationMap = new Map(destinationsList.map((d) => [d.iata_code, d]));

  console.log("Destinations loaded:", destinationsList.length);
}

// HELPER
function enrichAirport(code) {
  const d = destinationMap.get(code);

  if (!d) {
    return { code };
  }

  return {
    code,
    city: d.city_name,
    airport: d.airport_name,
  };
}

async function getDestinations(req, res) {
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
}

async function search(req, res) {
  try {
    const { destinations, weekday, nights, flexibility = "none" } = req.body;

    const result = await searchFlights({
      destinations,
      weekday,
      nights,
      flexibility,
      enrichAirport,
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "Internal error" });
  }
}

async function searchStream(req, res) {
  try {
    const { destinations, weekday, nights, flexibility = "none" } = req.body;

    // SSE HEADERS
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

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

    // SMART FLEX EXTENSION (append tasks)
    if (appConfig.smartFlex.enabled && flexibility === "smart") {
      for (const destination of destinations) {
        for (const trip of trips) {
          const variants = expandControlledFlexibility(trip);

          // skip original (index 0), mert az már benne van base tasks-ben
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
      // RAW DEBUG
      console.log("STREAM RESULT:", JSON.stringify(result, null, 2));

      if (!result.success) {
        res.write(`event: fail\ndata: fail\n\n`);
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

      // STREAM SEND
      res.write(`data: ${JSON.stringify(enriched)}\n\n`);
    });

    // END SIGNAL
    res.write(`event: end\ndata: done\n\n`);
    res.end();
  } catch (err) {
    res.write(`event: error\ndata: error\n\n`);
    res.end();
  }
}

module.exports = {
  initDestinations,
  getDestinations,
  search,
  searchStream,
};
