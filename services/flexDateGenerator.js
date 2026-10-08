const dayjs = require("dayjs");
const { smartFlex } = require("../config/appConfig");

function expandControlledFlexibility(trip) {
  const results = [];

  const original = {
    departure: trip.departure,
    return: trip.return,
  };

  results.push(original);

  const depMinus = dayjs(trip.departure).subtract(
    smartFlex.departureShiftDays,
    "day",
  );

  const today = dayjs().startOf("day");

  if (depMinus.valueOf() >= today.valueOf()) {
    results.push({
      departure: depMinus.format("YYYY-MM-DD"),
      return: trip.return,
    });
  }

  const retPlus = dayjs(trip.return).add(smartFlex.returnShiftDays, "day");

  results.push({
    departure: trip.departure,
    return: retPlus.format("YYYY-MM-DD"),
  });

  return results;
}

module.exports = {
  expandControlledFlexibility,
};
