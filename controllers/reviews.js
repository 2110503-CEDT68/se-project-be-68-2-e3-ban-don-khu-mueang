const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Review = require('../models/Review');

const validateRatingValue = (ratingValue) => {
    return ratingValue !== undefined && Number.isInteger(Number(ratingValue)) && Number(ratingValue) >= 1 && Number(ratingValue) <= 5;
};

const createReviewFromReservation = async ({ reservation, userId, ratingValue, comment }) => {
    const existingReview = await Review.findOne({ reservation: reservation._id });

    if (existingReview) {
        const error = new Error('You have already reviewed this reservation');
        error.statusCode = 400;
        throw error;
    }

    const rating = Number(ratingValue);
    const reviewPayload = {
        reservation: reservation._id,
        user: userId,
        massage: reservation.massage,
        rating,
    };

    if (comment !== undefined) {
        if (typeof comment !== 'string') {
            const error = new Error('Comment must be a string');
            error.statusCode = 400;
            throw error;
        }

        const trimmedComment = comment.trim();
        if (trimmedComment.length > 0) {
            reviewPayload.comment = trimmedComment;
        }
    }

    return Review.create(reviewPayload);
};

// @desc    Create a review for a reservation
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res, next) => {
    try {
        const { reservation: reservationId, rating, comment } = req.body;

        if (!reservationId) {
            return res.status(400).json({ success: false, message: 'Please provide a reservation ID' });
        }

        if (!mongoose.Types.ObjectId.isValid(reservationId)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid reservation ID' });
        }

        if (!validateRatingValue(rating)) {
            return res.status(400).json({ success: false, message: 'Please provide a whole number rating between 1 and 5' });
        }

        const reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${reservationId}` });
        }

        if (reservation.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to review this reservation` });
        }

        const review = await createReviewFromReservation({
            reservation,
            userId: req.user.id,
            ratingValue: rating,
            comment,
        });

        res.status(201).json({ success: true, data: review });
    } catch (error) {
        console.log(error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Cannot create review',
        });
    }
};

exports.createReviewFromReservation = createReviewFromReservation;