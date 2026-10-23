function validateAuthBody(req, res, next) {
  if (
    req.body === null ||
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid request body.",
    });
  }

  next();
}

module.exports = { validateAuthBody };
