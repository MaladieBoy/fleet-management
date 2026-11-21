const express = require("express");
const router = express.Router();

const {
    addFuelRecord,
    getFuelHistory,
    calculateFuelConsumption,
    getVehicleFuelConsumption
} = require("../controllers/fuelController");

router.post("/", addFuelRecord);
router.get("/:vehicleId/consumption", calculateFuelConsumption);
router.get("/:vehicleId/statistics", getVehicleFuelConsumption);
router.get("/:vehicleId", getFuelHistory);

module.exports = router;
