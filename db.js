const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.sqlite");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  const cities = ["Paris", "Rome", "Berlin", "Madrid", "Lisbon"];

  cities.forEach(city => {
    db.run(
      "INSERT OR IGNORE INTO destinations (name) VALUES (?)",
      [city]
    );
  });
});

module.exports = db;
