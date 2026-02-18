const express = require("express");
const router = express.Router();
const config = require("../config/appConfig");

router.get("/", (req, res) => {
  res.json(config);
});

module.exports = router;
