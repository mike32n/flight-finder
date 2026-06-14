require("dotenv").config();

const app = require("./app");

const { initDestinations } = require("./routes/searchRoutes");

(async () => {
  await initDestinations();

  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
})();
