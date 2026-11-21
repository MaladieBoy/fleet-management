const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");
const FuelRecord = require("../models/FuelRecord");
const Maintenance = require("../models/Maintenance");

const getAllVehicles = async (req, res) => {
    try {
        const filter = {};

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.region) {
            filter.region = req.query.region;
        }

        if (req.query.fuelType) {
            filter.fuelType = req.query.fuelType;
        }

        if (req.query.search) {
            filter.$or = [
                { registrationNumber: { $regex: req.query.search, $options: "i" } },
                { brand: { $regex: req.query.search, $options: "i" } },
                { model: { $regex: req.query.search, $options: "i" } }
            ];
        }

        const vehicles = await Vehicle.find(filter)
            .populate("region")
            ;

        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getVehicleById = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id)
            .populate("region")
            ;

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.create({
            ...req.body,
            statusHistory: [{
                status: req.body.status || "at_parking",
                note: "Vehicle created"
            }]
        });

        res.status(201).json(vehicle);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateVehicle = async (req, res) => {
    try {
        const allowedFields = [
            "registrationNumber",
            "brand",
            "model",
            "type",
            "year",
            "fuelType",
            "fuelTankCapacity",
            "mileage",
            "currentFuelLevel",
            "region",
            "photo",
            "insuranceExpiry",
            "technicalInspectionExpiry"
        ];

        const updates = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate("region");

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        res.json(vehicle);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteVehicle = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid vehicle ID" });
        }

        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        if (vehicle.status === "on_mission") {
            return res.status(400).json({
                message: "Cannot delete a vehicle currently assigned to a mission"
            });
        }

        if (vehicle.assignedWorker) {
            return res.status(400).json({
                message: "Unassign the worker before deleting this vehicle"
            });
        }

        const [fuelRecord, maintenanceRecord] = await Promise.all([
            FuelRecord.exists({ vehicle: vehicle._id }),
            Maintenance.exists({ vehicle: vehicle._id })
        ]);

        if (fuelRecord || maintenanceRecord) {
            const linkedRecords = [];

            if (fuelRecord) {
                linkedRecords.push("fuel records");
            }

            if (maintenanceRecord) {
                linkedRecords.push("maintenance records");
            }

            return res.status(400).json({
                message: `Cannot delete this vehicle because it has linked ${linkedRecords.join(" and ")}`
            });
        }

        await vehicle.deleteOne();

        res.json({ message: "Vehicle deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAvailableVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ status: "available" })
            .populate("region")
            ;

        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const changeVehicleStatus = async (req, res) => {
    try {
        const { status, note } = req.body;

        const allowedStatuses = [
            "available",
            "on_mission",
            "at_parking",
            "under_maintenance",
            "out_of_service"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid vehicle status" });
        }

        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        if (vehicle.status === status) {
            return res.json(vehicle);
        }

        vehicle.status = status;

        vehicle.statusHistory.push({
            status,
            note: note || ""
        });

        await vehicle.save();

        res.json(vehicle);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getVehicleStatusHistory = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id)
            .select("registrationNumber status statusHistory");

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        res.json(vehicle.statusHistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    getAvailableVehicles,
    changeVehicleStatus,
    getVehicleStatusHistory
};
