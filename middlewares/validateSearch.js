module.exports = function validateSearch(req, res, next) {
  const { destinations, weekday, nights, flexibility } = req.body;

  if (!Array.isArray(destinations) || destinations.length === 0) {
    return res
      .status(400)
      .json({ error: "Destinations must be a non-empty array" });
  }

  if (typeof weekday !== "number" || weekday < 0 || weekday > 6) {
    return res.status(400).json({ error: "Weekday must be between 0 and 6" });
  }

  if (typeof nights !== "number" || nights <= 0 || nights > 30) {
    return res.status(400).json({ error: "Nights must be between 1 and 30" });
  }

  if (
    flexibility !== undefined &&
    flexibility !== "none" &&
    flexibility !== "controlled" &&
    flexibility !== "smart"
  ) {
    return res.status(400).json({
      error: "flexibility must be 'none' or 'controlled'",
    });
  }

  next();
};
