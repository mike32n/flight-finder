const db = require("../db");

function getAllDestinations() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM destinations", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = { getAllDestinations };
