const airports = require("../data/airports");

const airportCodes = new Set(airports.map(({ iata }) => iata));

function isKnownAirportCode(code) {
  return typeof code === "string" && airportCodes.has(code);
}

module.exports = { isKnownAirportCode };
