const appConfig = require("../config/appConfig");

function validateSearch(req, res, next) {
  const { destinations, weekday, nights } = req.body;

  if (
    !Array.isArray(destinations) ||
    destinations.length === 0 ||
    destinations.length > appConfig.destinations.maxSelected ||
    destinations.some(
      (code) => typeof code !== "string" || !/^[A-Z]{3}$/.test(code),
    ) ||
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

  next();
}

module.exports = validateSearch;
