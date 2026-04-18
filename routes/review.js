const express = require('express');
const { 
    getReviews, 
    getReview, 
    addReview, 
    updateReview, 
    deleteReview,
    createReview,
    getMyReviews,
    getMyReviewsByReservationId
} = require('../controllers/reviews');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

router.route('/me')
    .get(protect, authorize('admin', 'user'), getMyReviews);

router.route('/me/reservation/:reservationId')
    .get(protect, authorize('admin', 'user'), getMyReviewsByReservationId);

router.route('/')
    .get(getReviews)
    .post(protect, authorize('admin', 'user'), createReview);

router.route('/:id')
    .get(getReview)
    .put(protect, authorize('admin', 'user'), updateReview)
    .delete(protect, authorize('admin', 'user'), deleteReview);

module.exports = router;