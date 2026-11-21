const express = require("express");
const router = express.Router();

const {
    addFuelRecord,
    getFuelHistory,
    calculateFuelConsumption,
    getVehicleFuelConsumption,
    getFuelConsumptionReport
} = require("../controllers/fuelController");

router.post("/", addFuelRecord);
router.get("/:vehicleId/consumption", calculateFuelConsumption);
router.get("/:vehicleId/statistics", getVehicleFuelConsumption);
router.get("/:vehicleId/report", getFuelConsumptionReport);
router.get("/:vehicleId", getFuelHistory);

module.exports = router;
