const appConfig = require("../config/appConfig");

const booleanFields = [
  "canSelectOrigin",
  "canSelectWeekday",
  "canSelectNights",
  "canSelectStartDate",
  "smartFlexEnabled",
  "searchHistoryEnabled",
  "favouritesEnabled",
  "adsEnabled",
];

const policyFields = [
  ...booleanFields,
  "maxDestinations",
  "fixedWeekday",
  "fixedNights",
];

function getPlanPolicyError(policy) {
  if (policy === null || typeof policy !== "object" || Array.isArray(policy)) {
    return "Invalid plan policy";
  }

  const hasMissingFields = policyFields.some(
    (field) => !Object.prototype.hasOwnProperty.call(policy, field),
  );

  const hasUnknownFields = Object.keys(policy).some(
    (field) => !policyFields.includes(field),
  );

  if (hasMissingFields || hasUnknownFields) {
    return "Invalid plan policy fields";
  }

  for (const field of booleanFields) {
    if (typeof policy[field] !== "boolean") {
      return `Invalid ${field}`;
    }
  }

  if (
    !Number.isInteger(policy.maxDestinations) ||
    policy.maxDestinations < 1 ||
    policy.maxDestinations > appConfig.destinations.maxSelected
  ) {
    return "Invalid maxDestinations";
  }

  if (
    !Number.isInteger(policy.fixedWeekday) ||
    policy.fixedWeekday < 0 ||
    policy.fixedWeekday > 6
  ) {
    return "Invalid fixedWeekday";
  }

  if (
    !Number.isInteger(policy.fixedNights) ||
    policy.fixedNights < 1 ||
    policy.fixedNights > appConfig.search.maxNights
  ) {
    return "Invalid fixedNights";
  }

  return null;
}

module.exports = getPlanPolicyError;
