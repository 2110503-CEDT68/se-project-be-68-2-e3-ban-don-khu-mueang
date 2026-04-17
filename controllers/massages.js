const Massage = require("../models/Massage");

// @desc    Get all massages
// @route   GET /api/massages
// @access  Public
exports.getMassages = async (req, res, next) => {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Remove fields from req.query
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string for operator (gt, gte, lt, lte, in)
    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    query = Massage.find(JSON.parse(queryStr));

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
        const total = await Massage.countDocuments(JSON.parse(queryStr));
        query = query.skip(startIndex).limit(limit);

        // Execute Query
        const massages = await query;

        // Pagination result
        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
            success: true,
            count: massages.length,
            totalCount: total,
            pagination,
            data: massages
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get single massage
// @route   GET /api/massages/:id
// @access  Public
exports.getMassage = async (req, res, next) => {
    try {
        const massage = await Massage.findById(req.params.id);

        if (!massage) {
            return res.status(400).json({ success: false, message: 'Massage shop not found' });
        }

        res.status(200).json({ success: true, data: massage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Create new massage
// @route   POST /api/massages
// @access  Private (Admin)
exports.createMassage = async (req, res, next) => {
    try {
        const massage = await Massage.create(req.body);
        res.status(201).json({ success: true, data: massage });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Update massage
// @route   PUT /api/massages/:id
// @access  Private (Admin)
exports.updateMassage = async (req, res, next) => {
    try {
        const massage = await Massage.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!massage) {
            return res.status(404).json({ success: false, message: `No massage shop with id ${req.params.id}` });
        }
        res.status(200).json({ success: true, data: massage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Delete massage
// @route   DELETE /api/massages/:id
// @access  Private (Admin)
exports.deleteMassage = async (req, res, next) => {
    try {
        const massage = await Massage.findById(req.params.id);

        if (!massage) {
            return res.status(404).json({ success: false, message: `No massage shop with id ${req.params.id}` });
        }

        // cascade delete is handled by the pre('deleteOne') hook on MassageSchema
        await massage.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: err.message });
    }
};
