const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.sqlite");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_name TEXT NOT NULL,
      iata_code TEXT UNIQUE NOT NULL
    )
  `);

  const cities = [
    { city: "Paris", iata: "PAR" },
    { city: "Rome", iata: "ROM" },
    { city: "Berlin", iata: "BER" },
    { city: "Madrid", iata: "MAD" },
    { city: "Lisbon", iata: "LIS" },
    { city: "Seoul", iata: "ICN" },
    { city: "London", iata: "LON" },
    { city: "Paris Charles de Gaulle", iata: "CDG" },
    { city: "Frankfurt", iata: "FRA" },
    { city: "New York John F Kennedy", iata: "JFK" },
    { city: "Barcelona", iata: "BCN" },
    { city: "Tenerife South Airport", iata: "TFS" },
    { city: "Larnaca", iata: "LCA" },
    { city: "Palma de Mallorca", iata: "PMI" },
    { city: "Milan", iata: "MXP" },
    { city: "Eindhoven", iata: "EIN" },
    { city: "Malé", iata: "MLE" },
    { city: "San José", iata: "SJC" }
  ];

  cities.forEach(c => {
    db.run(
      `INSERT OR IGNORE INTO destinations (city_name, iata_code)
       VALUES (?, ?)`,
      [c.city, c.iata]
    );
  });
});

module.exports = db;
