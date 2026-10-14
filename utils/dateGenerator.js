const dayjs = require("dayjs");
const { search } = require("../config/appConfig");

function generateTrips(
  weekday,
  nights,
  weeks = search.weeksToGenerate || 8,
  startDate,
) {
  const trips = [];
  const current = startDate ? dayjs(startDate) : dayjs();

  // starting weekday (0-6, Sunday-Saturday)
  const todayWeekday = current.day();

  // days until the requested weekday
  let diff = weekday - todayWeekday;
  if (diff < 0) diff += 7;

  // first departure is on or after the starting date
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
