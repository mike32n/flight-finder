const db = require("../db");

function getAllDestinations() {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT city_name, iata_code FROM destinations",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

module.exports = { getAllDestinations };
