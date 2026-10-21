const express = require("express");
const { resolveSearchAccess } = require("../middlewares/resolveSearchAccess");
const { getSearchAccess } = require("../controllers/searchAccessController");

const router = express.Router();

router.get(
  "/",
  (req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.vary("Authorization");
    next();
  },
  resolveSearchAccess,
  getSearchAccess,
);

module.exports = router;
