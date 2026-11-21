const mongoose = require("mongoose");
const Maintenance = require("../models/Maintenance");
const Vehicle = require("../models/Vehicle");

const addMaintenance = async (req, res) => {
    try {
        const {
            vehicle,
            type,
            description,
            date,
            mileage,
            cost,
            serviceProvider,
            status
        } = req.body;

        const existingVehicle = await Vehicle.findById(vehicle);

        if (!existingVehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        if (mileage < existingVehicle.mileage) {
            return res.status(400).json({
                message: "Maintenance mileage cannot be lower than vehicle mileage"
            });
        }

        const maintenance = await Maintenance.create({
            vehicle,
            type,
            description,
            date,
            mileage,
            cost,
            serviceProvider,
            status
        });

        if (status === "in_progress") {
            existingVehicle.status = "under_maintenance";
            existingVehicle.statusHistory.push({
                status: "under_maintenance",
                note: "Maintenance started"
            });

            await existingVehicle.save();
        }

        res.status(201).json(maintenance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getMaintenanceHistory = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.vehicleId);

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        const records = await Maintenance.find({
            vehicle: req.params.vehicleId
        }).sort({ date: -1 });

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateMaintenance = async (req, res) => {
    let session;

    try {
        session = await mongoose.startSession();

        let updatedMaintenance;

        await session.withTransaction(async () => {
            const maintenance = await Maintenance.findById(req.params.id).session(session);

            if (!maintenance) {
                const error = new Error("Maintenance record not found");
                error.statusCode = 404;
                throw error;
            }

            const vehicle = await Vehicle.findById(maintenance.vehicle).session(session);

            if (!vehicle) {
                const error = new Error("Vehicle not found");
                error.statusCode = 404;
                throw error;
            }

            const allowedFields = [
                "type",
                "description",
                "date",
                "mileage",
                "cost",
                "serviceProvider",
                "status"
            ];

            const updates = req.body || {};
            const invalidFields = Object.keys(updates).filter(
                field => !allowedFields.includes(field)
            );

            if (invalidFields.length > 0) {
                const error = new Error(
                    `Unsupported fields: ${invalidFields.join(", ")}`
                );
                error.statusCode = 400;
                throw error;
            }

            const fieldsToUpdate = allowedFields.filter(
                field => Object.prototype.hasOwnProperty.call(updates, field)
            );

            if (fieldsToUpdate.length === 0) {
                const error = new Error("No maintenance fields provided");
                error.statusCode = 400;
                throw error;
            }

            const mileageProvided = fieldsToUpdate.includes("mileage");
            const previousMaintenanceStatus = maintenance.status;

            for (const field of fieldsToUpdate) {
                maintenance[field] = updates[field];
            }

            const maintenanceStatusChanged =
                fieldsToUpdate.includes("status") &&
                maintenance.status !== previousMaintenanceStatus;

            if (mileageProvided && maintenance.mileage < vehicle.mileage) {
                const error = new Error(
                    "Maintenance mileage cannot be lower than vehicle mileage"
                );
                error.statusCode = 400;
                throw error;
            }

            await maintenance.save({ session });

            let vehicleChanged = false;
            let newVehicleStatus = vehicle.status;

            if (mileageProvided && maintenance.mileage > vehicle.mileage) {
                vehicle.mileage = maintenance.mileage;
                vehicleChanged = true;
            }

            if (maintenanceStatusChanged) {
                if (maintenance.status === "in_progress") {
                    newVehicleStatus = "under_maintenance";
                } else if (
                    previousMaintenanceStatus === "in_progress" &&
                    maintenance.status !== "in_progress" &&
                    vehicle.status === "under_maintenance"
                ) {
                    const otherActiveMaintenance = await Maintenance.findOne({
                        vehicle: vehicle._id,
                        status: "in_progress",
                        _id: { $ne: maintenance._id }
                    }).session(session);

                    if (!otherActiveMaintenance) {
                        newVehicleStatus = "available";
                    }
                }
            }

            if (newVehicleStatus !== vehicle.status) {
                vehicle.status = newVehicleStatus;

                vehicle.statusHistory.push({
                    status: newVehicleStatus,
                    note: `Maintenance ${maintenance.status}`
                });

                vehicleChanged = true;
            }

            if (vehicleChanged) {
                await vehicle.save({ session });
            }

            updatedMaintenance = maintenance;
        });

        res.json(updatedMaintenance);
    } catch (error) {
        const statusCode = error.statusCode ||
            (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);

        res.status(statusCode).json({ message: error.message });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

const getUpcomingMaintenance = async (req, res) => {
    try {
        const records = await Maintenance.find({
            status: "scheduled",
            date: { $gte: new Date() }
        })
            .populate("vehicle", "registrationNumber brand model")
            .sort({ date: 1 });

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteMaintenance = async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);

        if (!maintenance) {
            return res.status(404).json({ message: "Maintenance record not found" });
        }

        if (maintenance.status === "in_progress") {
            return res.status(400).json({
                message: "Cannot delete maintenance that is currently in progress"
            });
        }

        await Maintenance.findByIdAndDelete(req.params.id);

        res.json({ message: "Maintenance record deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


module.exports = {
    addMaintenance,
    getMaintenanceHistory,
    updateMaintenance,
    getUpcomingMaintenance,
    deleteMaintenance
};
