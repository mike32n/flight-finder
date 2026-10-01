function shouldRunFallbackFlex(baseResults) {
  return !baseResults.some((r) => r.success && r.data);
}

function analyzePriceDelta(baseResults, flexResults) {
  const baseOnly = baseResults
    .filter((r) => r.success && r.data)
    .map((r) => r.data);

  const flexOnly = flexResults
    .filter((r) => r.success && r.data)
    .map((r) => r.data);

  if (baseOnly.length === 0 || flexOnly.length === 0) {
    return null;
  }

  let bestInsight = null;

  for (const flex of flexOnly) {
    const matchingBase = baseOnly.find(
      (base) =>
        base.destination === flex.destination &&
        base.departure === flex.baseDeparture &&
        base.return === flex.baseReturn,
    );

    if (!matchingBase) continue;

    if (flex.price >= matchingBase.price) continue;

    const diff = matchingBase.price - flex.price;
    const percent = Math.round((diff / matchingBase.price) * 100);

    const flexDeparture = new Date(flex.departure);
    const baseDeparture = new Date(matchingBase.departure);

    const flexReturn = new Date(flex.return);
    const baseReturn = new Date(matchingBase.return);

    let reason = "flexible date";
    let type = "flex_generic";

    if (flexDeparture < baseDeparture) {
      reason = "leave earlier";
      type = "departure_shift";
    } else if (flexDeparture > baseDeparture) {
      reason = "leave later";
      type = "departure_shift";
    } else if (flexReturn < baseReturn) {
      reason = "return earlier";
      type = "return_shift";
    } else if (flexReturn > baseReturn) {
      reason = "return later";
      type = "return_shift";
    }

    const insight = {
      destination: flex.destination,
      percent,
      diff,
      reason,
      type,
      basePrice: matchingBase.price,
      flexPrice: flex.price,
    };

    if (!bestInsight || insight.diff > bestInsight.diff) {
      bestInsight = insight;
    }
  }

  return bestInsight;
}

module.exports = {
  shouldRunFallbackFlex,
  analyzePriceDelta,
};
