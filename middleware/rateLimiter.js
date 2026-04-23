const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 200,
    skip: (req, res) => process.env.NODE_ENV === "development",
    message: {
        success: false,
        message: "Too many requests, please try again later."
    }
});

module.exports = limiter;

