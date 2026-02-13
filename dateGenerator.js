const dayjs = require("dayjs");

function generateTrips(weekday, nights, weeks = 8) {
  const trips = [];
  let current = dayjs();

  // mai nap száma (0 = vasárnap, 1 = hétfő ...)
  const todayWeekday = current.day();

  // hány nap múlva van a kívánt weekday
  let diff = weekday - todayWeekday;
  if (diff < 0) diff += 7;

  // első indulási dátum
  let firstDeparture = current.add(diff, "day");

  for (let i = 0; i < weeks; i++) {
    const departure = firstDeparture.add(i * 7, "day");
    const returnDate = departure.add(nights, "day");

    trips.push({
      departure: departure.format("YYYY-MM-DD"),
      return: returnDate.format("YYYY-MM-DD")
    });
  }

  return trips;
}

module.exports = generateTrips;