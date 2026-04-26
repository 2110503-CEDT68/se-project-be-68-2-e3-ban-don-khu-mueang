const mongoose = require("mongoose");

const DB_STATES = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
};

//@desc     Check API and database health
//@route    GET /api/health
//@access   Public
exports.getHealth = (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = DB_STATES[dbState] ?? "unknown";
    const dbHealthy = dbState === 1;

    res.status(200).json({
        success: true,
        api: "healthy",
        database: {
            status: dbStatus,
            healthy: dbHealthy
        }
    });
};
