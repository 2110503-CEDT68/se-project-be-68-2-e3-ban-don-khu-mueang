const express = require('express');
const { getMyReviews, getMyReviewsByReservationId, createReview } = require('../controllers/reviews');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.route('/')
	.post(protect, authorize('admin', 'user'), createReview);

router.route('/me')
	.get(protect, authorize('admin', 'user'), getMyReviews);

router.route('/me/reservation/:reservationId')
	.get(protect, authorize('admin', 'user'), getMyReviewsByReservationId);

module.exports = router;