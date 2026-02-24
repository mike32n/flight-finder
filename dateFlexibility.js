function expandControlledFlexibility(trip) {
  const results = [];

  const original = {
    departure: trip.departure,
    return: trip.return,
  };

  results.push(original);

  // departure -1 nap (return FIX)
  const depMinus1 = new Date(trip.departure);
  depMinus1.setDate(depMinus1.getDate() - 1);

  results.push({
    departure: depMinus1.toISOString().split("T")[0],
    return: trip.return,
  });

  // return +1 nap (departure FIX)
  const retPlus1 = new Date(trip.return);
  retPlus1.setDate(retPlus1.getDate() + 1);

  results.push({
    departure: trip.departure,
    return: retPlus1.toISOString().split("T")[0],
  });

  return results;
}

module.exports = {
  expandControlledFlexibility,
};