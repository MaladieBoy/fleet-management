const express = require("express");
const {
    googleLogin,
    getCurrentUser,
    getProfile,
    updateProfile,
    logout
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/google", googleLogin);
router.get("/me", protect, getCurrentUser);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/logout", logout);

module.exports = router;
