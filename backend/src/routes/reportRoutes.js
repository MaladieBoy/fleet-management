const express = require("express");
const router = express.Router();

const {
    getVehicleStatistics,
    downloadVehicleStatisticsPDF
} = require("../controllers/reportController");

router.get("/vehicles/pdf", downloadVehicleStatisticsPDF);
router.get("/vehicles/statistics", getVehicleStatistics);

module.exports = router;
