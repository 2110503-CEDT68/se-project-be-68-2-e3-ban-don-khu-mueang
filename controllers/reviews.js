const Review = require("../models/Review");
const Massage = require("../models/Massage");

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