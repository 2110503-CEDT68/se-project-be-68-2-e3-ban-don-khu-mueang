const express = require("express");
const { login, logout, getMe, register, registerAdmin } = require("../controllers/auth");

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

router.get("/me", protect, getMe);
router.post("/login", login);
router.get("/logout", logout);
router.post("/register", register);
router.post("/register-admin", protect, authorize("admin"), registerAdmin);
router.get("/admin-only", protect, authorize("admin"), (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome, admin! You have access to this protected route."
    });
});

module.exports = router;
