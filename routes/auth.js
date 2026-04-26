// se-project-be/routes/auth.js
const express = require("express");
const { 
    login, 
    logout, 
    getMe, 
    register, 
    registerAdmin,
    updateDetails,     
    updatePassword    
} = require("../controllers/auth");

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

// ✅ Added the new update routes
router.put("/updatedetails", protect, updateDetails);
router.put("/updatepassword", protect, updatePassword);

module.exports = router;