const dayjs = require("dayjs");

function expandControlledFlexibility(trip) {
  const results = [];

  const original = {
    departure: trip.departure,
    return: trip.return,
  };

  results.push(original);

  const depMinus1 = dayjs(trip.departure).subtract(1, "day");

  results.push({
    departure: depMinus1.format("YYYY-MM-DD"),
    return: trip.return,
  });

  const retPlus1 = dayjs(trip.return).add(1, "day");

  results.push({
    departure: trip.departure,
    return: retPlus1.format("YYYY-MM-DD"),
  });

  return results;
}

module.exports = {
  expandControlledFlexibility,
};
