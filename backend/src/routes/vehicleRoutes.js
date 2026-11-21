const express = require("express");
const router = express.Router();

const {
    getAllVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    getAvailableVehicles,
    changeVehicleStatus,
    getVehicleStatusHistory
} = require("../controllers/vehicleController");

router.get("/", getAllVehicles);
router.get("/available", getAvailableVehicles);
router.get("/:id/history", getVehicleStatusHistory);
router.get("/:id", getVehicleById);

router.post("/", createVehicle);
router.put("/:id", updateVehicle);
router.patch("/:id/status", changeVehicleStatus);
router.delete("/:id", deleteVehicle);

module.exports = router;
