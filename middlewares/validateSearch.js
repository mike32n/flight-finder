const appConfig = require("../config/appConfig");
const { isKnownAirportCode } = require("../utils/airportCatalog");
const getStartDateError = require("../utils/startDateValidator");

function validateSearch(req, res, next) {
  if (
    req.body === null ||
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    return res.status(400).json({
      error: "Invalid search payload",
    });
  }

  const { destinations, weekday, nights } = req.body;

  const origin =
    req.body.origin === undefined
      ? appConfig.departureAirports.default
      : req.body.origin;

  if (!isKnownAirportCode(origin)) {
    return res.status(400).json({ error: "Invalid origin" });
  }

  if (
    !Array.isArray(destinations) ||
    destinations.length === 0 ||
    destinations.length > appConfig.destinations.maxSelected ||
    destinations.some((code) => !isKnownAirportCode(code)) ||
    new Set(destinations).size !== destinations.length
  ) {
    return res.status(400).json({
      error: "Invalid destinations",
    });
  }

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return res.status(400).json({
      error: "Invalid weekday",
    });
  }

  if (
    !Number.isInteger(nights) ||
    nights <= 0 ||
    nights > appConfig.search.maxNights
  ) {
    return res.status(400).json({
      error: "Invalid nights",
    });
  }

  if (destinations.includes(origin)) {
    return res.status(400).json({
      error: "Departure and destination airports must differ",
    });
  }

  const startDateError = getStartDateError(req.body.startDate);

  if (startDateError) {
    return res.status(400).json({
      error: startDateError,
    });
  }

  if (req.body.startDate === "") {
    delete req.body.startDate;
  }

  req.body.origin = origin;
  next();
}

module.exports = validateSearch;
