const appConfig = require("./appConfig");

module.exports = {
  anonymous: {
    canSelectOrigin: false,
    maxDestinations: 1,
    canSelectWeekday: false,
    fixedWeekday: 6,
    canSelectNights: false,
    fixedNights: 1,
    canSelectStartDate: false,
    smartFlexEnabled: false,
    searchHistoryEnabled: false,
    favouritesEnabled: false,
    adsEnabled: true,
  },

  registered: {
    canSelectOrigin: true,
    maxDestinations: appConfig.destinations.maxSelected,
    canSelectWeekday: false,
    fixedWeekday: 6,
    canSelectNights: false,
    fixedNights: 1,
    canSelectStartDate: false,
    smartFlexEnabled: true,
    searchHistoryEnabled: true,
    favouritesEnabled: true,
    adsEnabled: true,
  },

  premium: {
    canSelectOrigin: true,
    maxDestinations: appConfig.destinations.maxSelected,
    canSelectWeekday: true,
    fixedWeekday: 6,
    canSelectNights: true,
    fixedNights: 1,
    canSelectStartDate: true,
    smartFlexEnabled: true,
    searchHistoryEnabled: true,
    favouritesEnabled: true,
    adsEnabled: false,
  },
};
