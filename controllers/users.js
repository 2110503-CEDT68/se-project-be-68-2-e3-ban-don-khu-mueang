const User = require("../models/User");

const TEL_REGEX = /^\d{3}-\d{3}-\d{4}$/;

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    try {
        const total = await User.countDocuments();
        const users = await User.find().sort("-createdAt").skip(startIndex).limit(limit);

        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
            success: true,
            count: users.length,
            totalCount: total,
            pagination,
            data: users
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin)
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: `No user with id ${req.params.id}` });
        }

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res, next) => {
    try {
        const { name, tel, email, password, role } = req.body;

        const telRegex = TEL_REGEX;
        if (!telRegex.test(tel)) {
            return res.status(400).json({
                success: false,
                message: "Error: Telephone number must be in the format xxx-xxx-xxxx"
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Error: Email already in use" });
        }

        const user = await User.create({ name, tel, email, password, role });

        res.status(201).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res, next) => {
    try {
        const { name, tel, email, role, password } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: `No user with id ${req.params.id}` });
        }

        if (name !== undefined) user.name = name;
        if (tel !== undefined) {
            if (!TEL_REGEX.test(tel)) {
                return res.status(400).json({
                    success: false,
                    message: "Error: Telephone number must be in the format xxx-xxx-xxxx"
                });
            }
            user.tel = tel;
        }
        if (email !== undefined) {
            const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
            if (existingUser) {
                return res.status(400).json({ success: false, message: "Error: Email already in use" });
            }
            user.email = email;
        }
        if (role !== undefined) user.role = role;
        if (password !== undefined) user.password = password;

        await user.save({ runValidators: true });

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: `No user with id ${req.params.id}` });
        }

        await user.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
