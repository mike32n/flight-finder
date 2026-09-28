const express = require("express");
const router = express.Router();
const config = require("../config/appConfig");

router.get("/", (req, res) => {
  res.json({
    destinations: {
      maxSelected: config.destinations.maxSelected,
    },
    search: {
      maxNights: config.search.maxNights,
      maxResults: config.search.maxResults,
    },
    auth: {
      emailVerificationRequired: config.auth.emailVerificationRequired,
    },
  });
});

module.exports = router;
