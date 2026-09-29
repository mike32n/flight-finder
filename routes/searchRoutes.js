const express = require("express");
const validateSearch = require("../middlewares/validateSearch");
const {
  initDestinations,
  getDestinations,
  search,
  searchStream,
} = require("../controllers/searchController");

const router = express.Router();

router.get("/destinations", getDestinations);

router.post("/search", validateSearch, search);

router.post("/search-stream", validateSearch, searchStream);

module.exports = {
  router,
  initDestinations,
};
