const express = require("express");
const { generateUploadUrl, finalizeUpload } = require("../controllers/uploads");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/presigned-url", protect, generateUploadUrl);
router.post("/finalize", protect, finalizeUpload);

module.exports = router;
