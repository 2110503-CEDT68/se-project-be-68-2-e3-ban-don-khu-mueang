const express = require("express");
const { createPromotion } = require("../controllers/promotions");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, authorize("admin"), createPromotion);

module.exports = router;
