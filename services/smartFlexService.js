function shouldRunFallbackFlex(baseResults) {
  if (baseResults.length === 0) {
    return false;
  }

  const hasSuccessfulResult = baseResults.some(
    (result) => result.success && result.data,
  );

  if (hasSuccessfulResult) {
    return false;
  }

  return baseResults.every(
    (result) => !result.success && result.reason === "no_results",
  );
}

function analyzeFlexResult(baseResults, flexResult) {
  if (!flexResult?.success || !flexResult.data) {
    return null;
  }

  const flex = flexResult.data;

  const matchingBase = baseResults
    .filter((result) => result.success && result.data)
    .map((result) => result.data)
    .find(
      (base) =>
        base.destination === flex.destination &&
        base.departure === flex.baseDeparture &&
        base.return === flex.baseReturn,
    );

  if (!matchingBase) {
    return null;
  }

  if (flex.price >= matchingBase.price) {
    return null;
  }

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

  return {
    percent,
    diff,
    reason,
    type,
    basePrice: matchingBase.price,
    flexPrice: flex.price,
  };
}

module.exports = {
  shouldRunFallbackFlex,
  analyzeFlexResult,
};
