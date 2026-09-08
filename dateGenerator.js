const dayjs = require("dayjs");
const { search } = require("./config/appConfig");

function generateTrips(
  weekday,
  nights,
  weeks = search.weeksToGenerate || 8,
) {
  const trips = [];
  let current = dayjs();

  // todays number (0-6, Sunday-Saturday)
  const todayWeekday = current.day();

  // how many days from now is the desired weekday
  let diff = weekday - todayWeekday;
  if (diff < 0) diff += 7;

  // first departure is the first desired weekday from now
  let firstDeparture = current.add(diff, "day");

  for (let i = 0; i < weeks; i++) {
    const departure = firstDeparture.add(i * 7, "day");
    const returnDate = departure.add(nights, "day");

    trips.push({
      departure: departure.format("YYYY-MM-DD"),
      return: returnDate.format("YYYY-MM-DD"),
    });
  }

  return trips;
}

module.exports = generateTrips;
