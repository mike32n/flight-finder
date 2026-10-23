const { getDb } = require("../db");
const { isKnownAirportCode } = require("../utils/airportCatalog");

function getAllDestinations() {
  const db = getDb();

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT city_name, iata_code, airport_name FROM destinations",
      [],
      (err, rows) => {
        if (err) return reject(err);

        resolve(rows.filter(({ iata_code }) => isKnownAirportCode(iata_code)));
      },
    );
  });
}

module.exports = { getAllDestinations };
