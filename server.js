require("dotenv").config();

const app = require("./app");

const { initDb } = require("./db");
const { initDestinations } = require("./routes/searchRoutes");

(async () => {
  await initDb();
  await initDestinations();

  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
})();
