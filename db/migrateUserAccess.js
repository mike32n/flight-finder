function readColumns(db) {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(users)", [], (error, rows) => {
      if (error) {
        return reject(error);
      }

      resolve(rows);
    });
  });
}

function run(db, sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
}

async function migrateUserAccess(db) {
  const columns = await readColumns(db);
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("plan")) {
    await run(
      db,
      `
        ALTER TABLE users
        ADD COLUMN plan TEXT NOT NULL DEFAULT 'registered'
          CHECK (plan IN ('registered', 'premium'))
      `,
    );
  }

  if (!columnNames.has("is_admin")) {
    await run(
      db,
      `
        ALTER TABLE users
        ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0
          CHECK (is_admin IN (0, 1))
      `,
    );
  }
}

module.exports = migrateUserAccess;
