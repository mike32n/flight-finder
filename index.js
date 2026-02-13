const express = require("express");
const generateTrips = require("./dateGenerator");
const { searchMockFlights } = require("./flightService");
const runWithConcurrencyLimit = require("./promisePool");

const app = express();
app.use(express.json());

app.post("/search", async (req, res) => {
  const { destinations, weekday, nights } = req.body;

  if (
    !destinations ||
    !Array.isArray(destinations) ||
    destinations.length === 0 ||
    weekday === undefined ||
    weekday === null ||
    nights === undefined ||
    nights === null
  ) {
    return res.status(400).json({ error: "Hiányzó vagy hibás paraméter!" });
  }

  const trips = generateTrips(weekday, nights);

  const tasks = [];

  for (const destination of destinations) {
    for (const trip of trips) {
      tasks.push(() =>
        searchMockFlights(destination, trip.departure, trip.return)
      );
    }
  }

  // itt várjuk meg az összeset
  // max 5 párhuzamos hívás
  const results = await runWithConcurrencyLimit(tasks, 5);

  // rendezés ár szerint
  const successful = results
    .filter(r => r.success)
    .map(r => r.data);

  successful.sort((a, b) => a.price - b.price);

  const top5 = successful.slice(0, 5);

  res.json({
    results: top5,
    failedRequests: results.filter(r => !r.success).length
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});