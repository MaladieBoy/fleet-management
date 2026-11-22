const express = require("express");
const router = express.Router();

const {
    getRegions,
    createRegion,
    updateRegion,
    deleteRegion
} = require("../controllers/regionController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", authorize(
    "general_director",
    "regional_director",
    "driver"
), getRegions);

router.post("/", authorize("general_director"), createRegion);
router.put("/:id", authorize("general_director"), updateRegion);
router.delete("/:id", authorize("general_director"), deleteRegion);

module.exports = router;
