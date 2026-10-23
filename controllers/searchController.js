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

  console.log("Airports loaded:", destinationsList.length);
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

function watchSearchConnection(res) {
  const controller = new AbortController();

  const handleClose = () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  };

  res.once("close", handleClose);

  if (res.destroyed || res.writableEnded) {
    controller.abort();
  }

  return {
    signal: controller.signal,

    canRespond: () =>
      !controller.signal.aborted && !res.destroyed && !res.writableEnded,

    dispose: () => res.off("close", handleClose),
  };
}

async function search(req, res) {
  const connection = watchSearchConnection(res);

  try {
    if (!connection.canRespond()) return;

    const result = await searchFlights({
      ...req.searchParameters,
      enrichAirport,
      signal: connection.signal,
    });

    if (connection.canRespond()) {
      return res.json(result);
    }
  } catch (err) {
    if (connection.canRespond()) {
      return res.status(500).json({ error: "Internal error" });
    }
  } finally {
    connection.dispose();
  }
}

async function searchStream(req, res) {
  const connection = watchSearchConnection(res);

  try {
    if (!connection.canRespond()) return;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await searchFlightsStream({
      ...req.searchParameters,
      enrichAirport,
      signal: connection.signal,

      onResult(result) {
        if (!connection.canRespond()) return;

        if (result.type === "fail") {
          res.write("event: fail\ndata: fail\n\n");
          return;
        }

        res.write(`data: ${JSON.stringify(result.data)}\n\n`);
      },
    });

    if (connection.canRespond()) {
      res.end("event: end\ndata: done\n\n");
    }
  } catch (err) {
    if (connection.canRespond()) {
      res.end("event: error\ndata: error\n\n");
    }
  } finally {
    connection.dispose();
  }
}

module.exports = {
  initDestinations,
  getDestinations,
  search,
  searchStream,
};
