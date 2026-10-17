const express = require("express");

const { authenticateToken } = require("../middlewares/authMiddleware");
const { loadUserAccess } = require("../middlewares/loadUserAccess");
const { requireAdmin } = require("../middlewares/requireAdmin");
const { getPlanPolicies } = require("../controllers/adminController");

const router = express.Router();

router.use(authenticateToken, loadUserAccess, requireAdmin);

router.get("/plan-policies", getPlanPolicies);

module.exports = router;
