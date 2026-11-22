const express = require("express");
const router = express.Router();

const {
    getUsers,
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser
} = require("../controllers/userController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", authorize(
    "general_director",
    "regional_director"
), getUsers);

router.post("/", authorize(
    "general_director",
    "regional_director"
), createUser);

router.put("/:id", authorize(
    "general_director",
    "regional_director"
), updateUser);

router.patch("/:id/status", authorize(
    "general_director",
    "regional_director"
), updateUserStatus);

router.delete("/:id", authorize(
    "regional_director"
), deleteUser);

module.exports = router;
