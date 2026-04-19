const express = require('express');
const { getMassages, getMassage, createMassage, updateMassage, deleteMassage } = require('../controllers/massages');

const reservationRouter = require('./reservations');
const reviewRouter = require('./reviews');

const router = express.Router({ mergeParams: true });

// auth middleware
const { protect, authorize } = require('../middleware/auth');

router.use('/:massageId/reservations', reservationRouter);
router.use('/:massageId/reviews', reviewRouter);

router.route('/').get(getMassages).post(protect, authorize('admin'), createMassage);
router.route('/:id').get(getMassage).put(protect, authorize('admin'), updateMassage).delete(protect, authorize('admin'), deleteMassage);

module.exports = router;