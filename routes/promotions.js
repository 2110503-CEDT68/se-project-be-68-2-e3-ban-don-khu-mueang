const express = require('express');
const { 
    getPromotions, 
    createPromotion, 
    updatePromotion, 
    deletePromotion 
} = require('../controllers/promotions');

const router = express.Router();

// Assuming you are using your standard auth middleware
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(protect, authorize('admin'), getPromotions)
    .post(protect, authorize('admin'), createPromotion);

router.route('/:id')
    .put(protect, authorize('admin'), updatePromotion)
    .delete(protect, authorize('admin'), deletePromotion);

module.exports = router;