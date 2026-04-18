const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Review = require("../models/Review");
const Massage = require("../models/Massage");

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

// @desc    Get reviews
// @route   GET /api/reviews
// @route   GET /api/massages/:massageId/reviews
// @access  Public
exports.getReviews = async (req, res, next) => {
    let query;

    // Copy req.query for advanced filtering
    const reqQuery = { ...req.query };

    // Remove fields from req.query
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string for operators (gt, gte, lt, lte, in)
    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Parse back to object
    let dbQuery = JSON.parse(queryStr);

    // If param contains massageId, add it to filter
    if (req.params.massageId) {
        dbQuery.massage = req.params.massageId;
    }

    // Query finding and populating user
    // We intentionally avoid populating massage to keep it as an ID string matching frontend TS Interface
    query = Review.find(dbQuery).populate({
        path: 'user',
        select: 'name'
    });

    // Select Fields
    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    // Sorting Logic
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    // Pagination Logic
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    try {
        const total = await Review.countDocuments(dbQuery);
        query = query.skip(startIndex).limit(limit);

        const reviews = await query;

        const pagination = {};

        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }

        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            };
        }

        res.status(200).json({ 
            success: true, 
            count: reviews.length, 
            totalCount: total,
            pagination, 
            data: reviews 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Cannot find Reviews' });
    }
};

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
exports.getReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id).populate({
            path: 'massage',
            select: 'name province'
        }).populate({
            path: 'user',
            select: 'name'
        });

        if (!review) {
            return res.status(404).json({ success: false, message: `No review found with the id of ${req.params.id}` });
        }

        res.status(200).json({ success: true, data: review });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Cannot find Review' });
    }
};

// @desc    Add review
// @route   POST /api/massages/:massageId/reviews
// @access  Private
exports.addReview = async (req, res, next) => {
    try {
        req.body.massage = req.params.massageId;
        req.body.user = req.user.id;

        const massage = await Massage.findById(req.params.massageId);

        if (!massage) {
            return res.status(404).json({ success: false, message: `No Massage with the id of ${req.params.massageId}` });
        }

        // Prevent multiple reviews from same user for same shop
        const existReview = await Review.findOne({ massage: req.params.massageId, user: req.user.id });
        if (existReview) {
            return res.status(400).json({ success: false, message: 'You have already rated this massage shop' });
        }

        const review = await Review.create(req.body);

        res.status(201).json({ success: true, data: review });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Cannot add Review' });
    }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res, next) => {
    try {
        let review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: `No review found with the id of ${req.params.id}` });
        }

        // Make sure user is review owner or admin
        if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to update review` });
        }

        Object.assign(review, req.body);
        await review.save();

        res.status(200).json({ success: true, data: review });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Cannot update Review' });
    }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: `No review found with the id of ${req.params.id}` });
        }

        // Make sure user is review owner or admin
        if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to delete review` });
        }

        await review.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Cannot delete Review' });
    }
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

// @desc    Get all reviews created by the logged-in user
// @route   GET /api/reviews/me
// @access  Private
exports.getMyReviews = async (req, res, next) => {
    try {
        const reviews = await Review.find({ user: req.user.id })
            .populate({ path: 'reservation', select: 'reserveDate createdAt' })
            .populate({ path: 'massage', select: 'name province' })
            .sort('-createdAt');

        return res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Cannot get user reviews',
        });
    }
};

// @desc    Get the logged-in user's review(s) by reservation ID (past reservations only)
// @route   GET /api/reviews/me/reservation/:reservationId
// @access  Private
exports.getMyReviewsByReservationId = async (req, res, next) => {
    try {
        const { reservationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(reservationId)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid reservation ID' });
        }

        const reservation = await Reservation.findById(reservationId).select('user reserveDate');

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${reservationId}` });
        }

        if (reservation.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to access this reservation review` });
        }

        if (new Date(reservation.reserveDate).getTime() > Date.now()) {
            return res.status(400).json({ success: false, message: 'This reservation is not in the past yet' });
        }

        const reviews = await Review.find({
            user: req.user.id,
            reservation: reservationId,
        })
            .populate({ path: 'reservation', select: 'reserveDate createdAt' })
            .populate({ path: 'massage', select: 'name province' })
            .sort('-createdAt');

        return res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Cannot get user reviews by reservation ID',
        });
    }
};

exports.createReviewFromReservation = createReviewFromReservation;