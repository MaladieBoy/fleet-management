const express = require("express");
const router = express.Router();

const {
    addMaintenance,
    getMaintenanceHistory,
    updateMaintenance,
    getUpcomingMaintenance,
    deleteMaintenance
} = require("../controllers/maintenanceController");

router.get("/upcoming", getUpcomingMaintenance);
router.get("/:vehicleId", getMaintenanceHistory);

router.post("/", addMaintenance);
router.put("/:id", updateMaintenance);
router.delete("/:id", deleteMaintenance);

module.exports = router;
