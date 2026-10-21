const dayjs = require("dayjs");
const appConfig = require("../config/appConfig");

function applySearchPolicy(
  parameters,
  policy,
  {
    defaultOrigin = appConfig.departureAirports.default,
    today = dayjs().format("YYYY-MM-DD"),
  } = {},
) {
  return {
    origin: policy.canSelectOrigin
      ? (parameters.origin ?? defaultOrigin)
      : defaultOrigin,

    destinations: [...parameters.destinations],

    weekday: policy.canSelectWeekday ? parameters.weekday : policy.fixedWeekday,

    nights: policy.canSelectNights ? parameters.nights : policy.fixedNights,

    startDate: policy.canSelectStartDate
      ? parameters.startDate || today
      : today,

    allowFlexSearch: policy.smartFlexEnabled,
  };
}

function getSearchPolicyError(parameters, policy) {
  if (parameters.destinations.length > policy.maxDestinations) {
    const noun = policy.maxDestinations === 1 ? "destination" : "destinations";

    return `Your plan allows up to ${policy.maxDestinations} ${noun}.`;
  }

  if (parameters.destinations.includes(parameters.origin)) {
    return "Departure and destination airports must differ";
  }

  return null;
}

module.exports = {
  applySearchPolicy,
  getSearchPolicyError,
};
