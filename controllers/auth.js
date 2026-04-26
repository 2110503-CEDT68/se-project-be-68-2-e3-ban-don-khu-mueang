const User = require("../models/User");
const sendTokenResponse = require("../lib/sendTokenResponse");

const TEL_REGEX = /^\d{3}-\d{3}-\d{4}$/;
const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const normalizeString = (value) => value.trim();
const normalizeEmail = (value) => value.trim().toLowerCase();

//@desc     Login user
//@route    POST /api/auth/login
//@access   Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
            return res.status(400).json({
                success: false,
                message: "Error: Please provide both email and password"
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const normalizedPassword = normalizeString(password);
        const loginQuery = { email: normalizedEmail };

        const user = await User.findOne(loginQuery).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Error: Invalid credentials"
            });
        }
        const isMatch = await user.matchPassword(normalizedPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Error: Invalid credentials"
            });
        }
        sendTokenResponse(user, 200, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error: Internal server error"
        });
    }
}

//@desc     Logout user
//@route    GET /api/auth/logout
//@access   Public
exports.logout = (req, res) => {
    res.cookie("token", "none", {
        expires: new Date(0),
        httpOnly: true
    }).json({
        success: true,
        message: "Logged out successfully"
    });
}

//@desc     Get current logged in user
//@route    GET /api/auth/me
//@access   Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error: Internal server error"
        });
    }
}
//@desc     Register new user
//@route    POST /api/auth/register
//@access   Public
exports.register = async (req, res) => {
    const { name, tel, email, password } = req.body;
    try {
        if (!isNonEmptyString(name) || !isNonEmptyString(tel) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
            return res.status(400).json({
                success: false,
                message: "Error: name, tel, email and password must be non-empty strings"
            });
        }

        const normalizedName = normalizeString(name);
        const normalizedTel = normalizeString(tel);
        const normalizedEmail = normalizeEmail(email);
        const normalizedPassword = normalizeString(password);

        if (!TEL_REGEX.test(normalizedTel)) {
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

        const user = await User.create(createPayload);
        sendTokenResponse(user, 201, res);
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: `Error: Registration failed - ${error.message}`
        });
    }
};

//@desc     Register new admin user
//@route    POST /api/auth/register-admin
//@access   Private (Admin)
exports.registerAdmin = async (req, res) => {
    const { name, tel, email, password } = req.body;
    try {
        if (!isNonEmptyString(name) || !isNonEmptyString(tel) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
            return res.status(400).json({
                success: false,
                message: "Error: name, tel, email and password must be non-empty strings"
            });
        }

        const normalizedName = normalizeString(name);
        const normalizedTel = normalizeString(tel);
        const normalizedEmail = normalizeEmail(email);
        const normalizedPassword = normalizeString(password);

        if (!TEL_REGEX.test(normalizedTel)) {
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
            password: normalizedPassword,
            role: "admin"
        };

        const user = await User.create(createPayload);
        sendTokenResponse(user, 201, res);
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: `Error: Admin registration failed - ${error.message}`
        });
    }
};

// Add to controllers/auth.js

//@desc    Update user details (Name, Email, Telephone)
//@route   PUT /api/auth/updatedetails
//@access  Private
exports.updateDetails = async (req, res) => {
    try {
        const { name, email, tel, currentPassword } = req.body;

        // 1. Verify current password for security
        const user = await User.findById(req.user.id).select("+password");
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Error: Current password is not correct" });
        }

        // 2. Check for duplicate email if the user is trying to change it
        let normalizedNewEmail = user.email;
        if (email) {
            normalizedNewEmail = normalizeEmail(email); // Assuming normalizeEmail is defined in your file
            
            // Only check the database if the email is actually different from their current one
            if (normalizedNewEmail !== user.email) {
                const existingUser = await User.findOne({ email: normalizedNewEmail });
                if (existingUser) {
                    return res.status(400).json({ success: false, message: "Error: Email already in use by another account" });
                }
            }
        }

        // 3. Update fields
        const fieldsToUpdate = {
            name: name ? normalizeString(name) : user.name,
            email: normalizedNewEmail,
            tel: tel ? normalizeString(tel) : user.tel
        };

        const updatedUser = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        console.error(error);
        
        // Handle MongoDB unique constraint error (just as a fallback)
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Error: Email already in use by another account" });
        }

        res.status(500).json({ success: false, message: "Error: Internal server error" });
    }
};

//@desc     Update password
//@route    PUT /api/auth/updatepassword
//@access   Private
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select("+password");
        
        // 1. Verify current password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Error: Current password is not correct" });
        }

        // 2. Set new password and save (triggers mongoose pre-save hook to hash it)
        user.password = newPassword;
        await user.save();

        // 3. Return a new token
        sendTokenResponse(user, 200, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error: Internal server error" });
    }
};
