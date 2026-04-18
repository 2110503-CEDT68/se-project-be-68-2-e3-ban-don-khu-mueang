const express = require('express');
const { getMyReviews, getMyReviewsByReservationId, createReview,deleteReview,updateReview } = require('../controllers/reviews');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.route('/')
	.post(protect, authorize('admin', 'user'), createReview);

router.route('/me')
	.get(protect, authorize('admin', 'user'), getMyReviews);

router.route('/me/reservation/:reservationId')
	.get(protect, authorize('admin', 'user'), getMyReviewsByReservationId);

router.route('/:id').delete(protect, authorize('admin', 'user'), deleteReview);
router.route('/:id').put(protect, authorize('admin', 'user'), updateReview);

module.exports = router;