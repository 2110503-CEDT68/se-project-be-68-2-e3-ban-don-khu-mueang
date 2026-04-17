const express = require('express');
const { createReview } = require('../controllers/reviews');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.route('/').post(protect, authorize('admin', 'user'), createReview);

module.exports = router;