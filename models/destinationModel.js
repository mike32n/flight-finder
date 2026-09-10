const { getDb } = require("../db");

function getAllDestinations() {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all("SELECT city_name, iata_code FROM destinations", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = { getAllDestinations };
