function shouldRunFallbackFlex(baseResults) {
  return !baseResults.some((r) => r.success && r.data);
}

function analyzePriceDelta(baseResults, flexResults) {
  const all = [...baseResults, ...flexResults].filter(
    (r) => r.success && r.data,
  );

  if (all.length === 0) return null;

  const sorted = [...all].sort((a, b) => a.data.price - b.data.price);
  const best = sorted[0].data;

  const baseOnly = baseResults
    .filter((r) => r.success && r.data)
    .map((r) => r.data);

  if (baseOnly.length === 0) return null;

  const baseBest = [...baseOnly].sort((a, b) => a.price - b.price)[0];

  // if the flex option is not cheaper - no need to communicate
  if (best.price >= baseBest.price) return null;

  const diff = baseBest.price - best.price;
  const percent = Math.round((diff / baseBest.price) * 100);

  // safe date comparisons (avoid timezone issues)
  const bestDeparture = new Date(best.departure);
  const baseDeparture = new Date(baseBest.departure);

  const bestReturn = new Date(best.return);
  const baseReturn = new Date(baseBest.return);

  let reason = "flexible date";
  let type = "flex_generic";

  if (bestDeparture < baseDeparture) {
    reason = "leave earlier";
    type = "departure_shift";
  } else if (bestReturn > baseReturn) {
    reason = "return later";
    type = "return_shift";
  }

  return {
    percent,
    diff,
    reason,
    type,
    basePrice: baseBest.price,
    flexPrice: best.price,
  };
}

module.exports = {
  shouldRunFallbackFlex,
  analyzePriceDelta,
};
