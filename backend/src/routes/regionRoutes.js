const express = require("express");
const router = express.Router();

const {
    getRegions,
    createRegion
} = require("../controllers/regionController");

router.get("/", getRegions);
router.post("/", createRegion);

module.exports = router;
