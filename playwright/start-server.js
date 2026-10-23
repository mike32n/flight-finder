const { mkdirSync } = require("node:fs");
const { dirname } = require("node:path");

if (process.env.E2E_TEST !== "true" || !process.env.DB_PATH) {
  throw new Error("The E2E server requires an isolated test environment.");
}

mkdirSync(dirname(process.env.DB_PATH), {
  recursive: true,
});

require("../server");
