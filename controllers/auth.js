const User = require("../models/User");
const sendTokenResponse = require("../lib/sendTokenResponse");

//@desc     Login user
//@route    POST /api/auth/login
//@access   Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Error: Please provide both email and password"
            });
        }
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Error: Invalid credentials"
            });
        }
        const isMatch = await user.matchPassword(password);
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
        const telRegex = /^\d{3}-\d{3}-\d{4}$/;
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
        const user = await User.create({ name, tel, email, password });
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
        const user = await User.create({ name, tel, email, password, role: "admin" });
        sendTokenResponse(user, 201, res);
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: `Error: Admin registration failed - ${error.message}`
        });
    }
};
