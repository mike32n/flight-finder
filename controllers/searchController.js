const { getAllDestinations } = require("../models/destinationModel");
const {
  searchFlights,
  searchFlightsStream,
} = require("../services/flightSearchService");

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
    const { destinations, weekday, nights } = req.body;

    const result = await searchFlights({
      destinations,
      weekday,
      nights,
      enrichAirport,
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "Internal error" });
  }
}

async function searchStream(req, res) {
  try {
    const { destinations, weekday, nights } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await searchFlightsStream({
      destinations,
      weekday,
      nights,
      enrichAirport,

      onResult(result) {
        if (result.type === "fail") {
          res.write(`event: fail\ndata: fail\n\n`);
          return;
        }

        res.write(`data: ${JSON.stringify(result.data)}\n\n`);
      },
    });

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
