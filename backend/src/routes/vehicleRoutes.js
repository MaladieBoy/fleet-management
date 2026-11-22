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

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

router.use(protect);

const managementRoles = ["regional_director"];

const viewingRoles = [
    "general_director",
    "regional_director",
    "driver"
];

const availableViewingRoles = [
    "general_director",
    "regional_director"
];

router.get("/", authorize(...viewingRoles), getAllVehicles);
router.get("/available", authorize(...availableViewingRoles), getAvailableVehicles);
router.get("/:id/history", authorize(...viewingRoles), getVehicleStatusHistory);
router.get("/:id", authorize(...viewingRoles), getVehicleById);

router.post("/", authorize(...managementRoles), createVehicle);
router.put("/:id", authorize(...managementRoles), updateVehicle);
router.patch("/:id/status", authorize(...managementRoles), changeVehicleStatus);
router.delete("/:id", authorize(...managementRoles), deleteVehicle);

module.exports = router;
