const User = require("../models/User");
const { Types } = require("mongoose");

const TEL_REGEX = /^\d{3}-\d{3}-\d{4}$/;
const VALID_ROLES = new Set(["user", "admin"]);

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const normalizeString = (value) => value.trim();
const normalizeEmail = (value) => value.trim().toLowerCase();
const isValidObjectId = (value) => typeof value === "string" && Types.ObjectId.isValid(value);

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
        const userId = req.params.id;
        if (!isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user id format" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: `No user with id ${userId}` });
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

        if (!isNonEmptyString(name) || !isNonEmptyString(tel) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
            return res.status(400).json({
                success: false,
                message: "Error: name, tel, email and password must be non-empty strings"
            });
        }

        if (role !== undefined && (!isNonEmptyString(role) || !VALID_ROLES.has(normalizeString(role)))) {
            return res.status(400).json({
                success: false,
                message: "Error: role must be either user or admin"
            });
        }

        const normalizedName = normalizeString(name);
        const normalizedTel = normalizeString(tel);
        const normalizedEmail = normalizeEmail(email);
        const normalizedPassword = normalizeString(password);
        const normalizedRole = role === undefined ? undefined : normalizeString(role);

        const telRegex = TEL_REGEX;
        if (!telRegex.test(normalizedTel)) {
            return res.status(400).json({
                success: false,
                message: "Error: Telephone number must be in the format xxx-xxx-xxxx"
            });
        }

        const existingUserQuery = { email: normalizedEmail };
        const existingUser = await User.findOne(existingUserQuery);
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Error: Email already in use" });
        }

        const createPayload = {
            name: normalizedName,
            tel: normalizedTel,
            email: normalizedEmail,
            password: normalizedPassword
        };
        if (normalizedRole !== undefined) {
            createPayload.role = normalizedRole;
        }

        const user = await User.create(createPayload);

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
        const userId = req.params.id;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user id format" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: `No user with id ${userId}` });
        }

        if (name !== undefined) {
            if (!isNonEmptyString(name)) {
                return res.status(400).json({ success: false, message: "Error: name must be a non-empty string" });
            }
            user.name = normalizeString(name);
        }

        if (tel !== undefined) {
            if (!isNonEmptyString(tel)) {
                return res.status(400).json({ success: false, message: "Error: tel must be a non-empty string" });
            }

            const normalizedTel = normalizeString(tel);
            if (!TEL_REGEX.test(normalizedTel)) {
                return res.status(400).json({
                    success: false,
                    message: "Error: Telephone number must be in the format xxx-xxx-xxxx"
                });
            }
            user.tel = normalizedTel;
        }

        if (email !== undefined) {
            if (!isNonEmptyString(email)) {
                return res.status(400).json({ success: false, message: "Error: email must be a non-empty string" });
            }

            const normalizedEmail = normalizeEmail(email);
            const existingUserQuery = { email: normalizedEmail, _id: { $ne: userId } };
            const existingUser = await User.findOne(existingUserQuery);
            if (existingUser) {
                return res.status(400).json({ success: false, message: "Error: Email already in use" });
            }
            user.email = normalizedEmail;
        }

        if (role !== undefined) {
            if (!isNonEmptyString(role) || !VALID_ROLES.has(normalizeString(role))) {
                return res.status(400).json({ success: false, message: "Error: role must be either user or admin" });
            }
            user.role = normalizeString(role);
        }

        if (password !== undefined) {
            if (!isNonEmptyString(password)) {
                return res.status(400).json({ success: false, message: "Error: password must be a non-empty string" });
            }
            user.password = normalizeString(password);
        }

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
        const userId = req.params.id;
        if (!isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user id format" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: `No user with id ${userId}` });
        }

        await user.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
