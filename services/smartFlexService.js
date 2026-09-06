const { smartFlex } = require("../config/appConfig");

function shouldRunFlex(baseResults) {
  const successful = baseResults.filter((r) => r.success && r.data);

  // if no successful results, we should run flex to try to find something
  if (successful.length === 0) return true;

  const prices = successful.map((r) => r.data.price);
  const minPrice = Math.min(...prices);

  const threshold = minPrice * smartFlex.triggerMultiplier;

  // how many prices are significantly more expensive?
  const expensiveCount = prices.filter((p) => p > threshold).length;

  // run flex if more than 70% of prices are significantly more expensive
  return expensiveCount / prices.length > 0.7;
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

  let reason = "rugalmasabb dátum";
  let type = "flex_generic";

  if (bestDeparture < baseDeparture) {
    reason = "korábban indulsz";
    type = "departure_shift";
  } else if (bestReturn > baseReturn) {
    reason = "később jössz vissza";
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
  shouldRunFlex,
  analyzePriceDelta,
};
