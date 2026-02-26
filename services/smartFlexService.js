function shouldRunFlex(baseResults) {
  const successful = baseResults.filter(r => r.success && r.data);

  if (successful.length === 0) return true;

  const prices = successful.map(r => r.data.price);
  const minPrice = Math.min(...prices);

  const threshold = minPrice * 1.1;

  const allAboveThreshold = prices.every(p => p > threshold);

  return allAboveThreshold;
}

function analyzePriceDelta(baseResults, flexResults) {
  const all = [...baseResults, ...flexResults]
    .filter(r => r.success && r.data);

  if (all.length === 0) return null;

  const sorted = [...all].sort((a, b) => a.data.price - b.data.price);

  const best = sorted[0].data;

  const baseOnly = baseResults
    .filter(r => r.success && r.data)
    .map(r => r.data);

  if (baseOnly.length === 0) return null;

  const baseBest = baseOnly.sort((a, b) => a.price - b.price)[0];

  if (best.price >= baseBest.price) return null;

  const diff = baseBest.price - best.price;
  const percent = Math.round((diff / baseBest.price) * 100);

  const reason =
    best.departure < baseBest.departure
      ? "korábban indulsz"
      : best.return > baseBest.return
      ? "később jössz vissza"
      : "rugalmasabb dátum";

  return `-${percent}% ha ${reason}`;
}

module.exports = {
  shouldRunFlex,
  analyzePriceDelta,
};
