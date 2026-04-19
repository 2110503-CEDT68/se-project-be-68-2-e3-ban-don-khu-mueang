const express = require('express');
const { 
    getMyReviews, 
    getMyReviewsByReservationId, 
    createReview,
    deleteReview,
    updateReview,
    getReviews,       // Public API (filters by massage shop)
    getAdminReviews,  // Admin API
    getReview 
} = require('../controllers/reviews');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

// Base routes (/api/reviews)
router.route('/')
    .get(getReviews) // <--- FIXED: Now 100% public so the shop page can read it!
    .post(protect, authorize('admin', 'user'), createReview);

// Admin-only route for getting ALL reviews across the whole site
router.route('/admin')
    .get(protect, authorize('admin'), getAdminReviews);

// Logged-in user routes
router.route('/me')
    .get(protect, authorize('admin', 'user'), getMyReviews);

router.route('/me/reservation/:reservationId')
    .get(protect, authorize('admin', 'user'), getMyReviewsByReservationId);

// Specific ID routes (/api/reviews/:id)
router.route('/:id')
    .get(getReview)
    .put(protect, authorize('admin', 'user'), updateReview)
    .delete(protect, authorize('admin', 'user'), deleteReview);

module.exports = router;