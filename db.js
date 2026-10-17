const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cities = require("./data/airports");
const initializePlanPolicies = require("./db/initializePlanPolicies");

let db;

function getDb() {
  if (!db) {
    const dbPath = process.env.DB_PATH || "./database.sqlite";

    console.log("DB file:", path.resolve(dbPath));

    db = new sqlite3.Database(dbPath);
    db.configure("busyTimeout", 5000);
    db.run("PRAGMA journal_mode = WAL");
  }

  return db;
}

async function initDb() {
  const db = getDb();

  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `
        CREATE TABLE IF NOT EXISTS destinations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          city_name TEXT NOT NULL,
          iata_code TEXT UNIQUE NOT NULL,
          airport_name TEXT NOT NULL
        )
        `,
        (err) => {
          if (err) {
            return reject(err);
          }

          const stmt = db.prepare(`
            INSERT OR IGNORE INTO destinations
            (city_name, iata_code, airport_name)
            VALUES (?, ?, ?)
          `);

          cities.forEach((c) => {
            stmt.run([c.city, c.iata, c.airport]);
          });

          stmt.finalize((err) => {
            if (err) {
              return reject(err);
            }

            db.run(
              `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_token TEXT,
      password_reset_token TEXT,
      password_reset_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    `,
              (err) => {
                if (err) {
                  return reject(err);
                }

                resolve();
              },
            );
          });
        },
      );
    });
  });

  await initializePlanPolicies(db);

  console.log("Database initialized successfully.");
}

function closeDb() {
  return new Promise((resolve, reject) => {
    if (!db) {
      return resolve();
    }

    db.close((err) => {
      if (err) {
        return reject(err);
      }

      db = null;
      resolve();
    });
  });
}

module.exports = {
  getDb,
  closeDb,
  initDb,
};
