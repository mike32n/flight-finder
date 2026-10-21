const express = require("express");
const validateSearch = require("../middlewares/validateSearch");
const { resolveSearchAccess } = require("../middlewares/resolveSearchAccess");
const { applySearchAccess } = require("../middlewares/applySearchAccess");
const {
  initDestinations,
  getDestinations,
  search,
  searchStream,
} = require("../controllers/searchController");

const router = express.Router();

router.get("/destinations", getDestinations);

router.post(
  "/search",
  validateSearch,
  resolveSearchAccess,
  applySearchAccess,
  search,
);

router.post(
  "/search-stream",
  validateSearch,
  resolveSearchAccess,
  applySearchAccess,
  searchStream,
);

module.exports = {
  router,
  initDestinations,
};
