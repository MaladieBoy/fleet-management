const mongoose = require("mongoose");
const Maintenance = require("../models/Maintenance");
const Vehicle = require("../models/Vehicle");

const addMaintenance = async (req, res) => {
    let session;

    try {
        const body = req.body;

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return res.status(400).json({
                message: "A valid JSON object is required"
            });
        }

        const allowedFields = [
            "vehicle",
            "type",
            "description",
            "date",
            "mileage",
            "cost",
            "serviceProvider",
            "status"
        ];

        const unsupportedFields = Object.keys(body).filter(
            field => !allowedFields.includes(field)
        );

        if (unsupportedFields.length > 0) {
            return res.status(400).json({
                message: `Unsupported fields: ${unsupportedFields.join(", ")}`
            });
        }

        if (!body.vehicle || !mongoose.Types.ObjectId.isValid(body.vehicle)) {
            return res.status(400).json({
                message: "A valid vehicle ID is required"
            });
        }

        const allowedTypes = [
            "Oil Change",
            "Repair",
            "Inspection",
            "Tire Replacement",
            "Other"
        ];

        if (!allowedTypes.includes(body.type)) {
            return res.status(400).json({
                message: "Invalid maintenance type"
            });
        }

        if (
            typeof body.description !== "string" ||
            !body.description.trim()
        ) {
            return res.status(400).json({
                message: "A maintenance description is required"
            });
        }

        if (
            typeof body.mileage !== "number" ||
            !Number.isFinite(body.mileage) ||
            body.mileage < 0
        ) {
            return res.status(400).json({
                message: "Maintenance mileage must be a non-negative number"
            });
        }

        if (
            body.cost !== undefined &&
            (typeof body.cost !== "number" ||
                !Number.isFinite(body.cost) ||
                body.cost < 0)
        ) {
            return res.status(400).json({
                message: "Maintenance cost must be a non-negative number"
            });
        }

        if (
            body.serviceProvider !== undefined &&
            typeof body.serviceProvider !== "string"
        ) {
            return res.status(400).json({
                message: "Service provider must be a string"
            });
        }

        if (body.date !== undefined) {
            const maintenanceDate = new Date(body.date);

            if (Number.isNaN(maintenanceDate.getTime())) {
                return res.status(400).json({
                    message: "Maintenance date must be valid"
                });
            }
        }

        const allowedStatuses = [
            "scheduled",
            "in_progress",
            "completed",
            "cancelled"
        ];

        const status = body.status ?? "scheduled";

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid maintenance status"
            });
        }

        session = await mongoose.startSession();

        let createdMaintenance;

        await session.withTransaction(async () => {
            const existingVehicle = await Vehicle.findById(body.vehicle)
                .session(session);

            if (!existingVehicle) {
                const error = new Error("Vehicle not found");
                error.statusCode = 404;
                throw error;
            }

            if (body.mileage < existingVehicle.mileage) {
                const error = new Error(
                    "Maintenance mileage cannot be lower than vehicle mileage"
                );
                error.statusCode = 400;
                throw error;
            }

            if (
                status === "in_progress" &&
                existingVehicle.status === "on_mission"
            ) {
                const error = new Error(
                    "Cannot start maintenance while the vehicle is on a mission"
                );
                error.statusCode = 400;
                throw error;
            }

            const [maintenance] = await Maintenance.create([{
                vehicle: body.vehicle,
                type: body.type,
                description: body.description.trim(),
                date: body.date,
                mileage: body.mileage,
                cost: body.cost,
                serviceProvider: body.serviceProvider?.trim() || "",
                status
            }], { session });

            let vehicleChanged = false;

            if (body.mileage > existingVehicle.mileage) {
                existingVehicle.mileage = body.mileage;
                vehicleChanged = true;
            }

            if (
                status === "in_progress" &&
                existingVehicle.status !== "under_maintenance"
            ) {
                existingVehicle.status = "under_maintenance";

                existingVehicle.statusHistory.push({
                    status: "under_maintenance",
                    note: "Maintenance started"
                });

                vehicleChanged = true;
            }

            if (vehicleChanged) {
                await existingVehicle.save({ session });
            }

            createdMaintenance = maintenance;
        });

        res.status(201).json(createdMaintenance);
    } catch (error) {
        const statusCode = error.statusCode ||
            (error.name === "ValidationError" || error.name === "CastError"
                ? 400
                : 500);

        res.status(statusCode).json({ message: error.message });
    } finally {
        if (session) {
            await session.endSession();
        }
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

            if (
                maintenanceStatusChanged &&
                maintenance.status === "in_progress" &&
                vehicle.status === "on_mission"
            ) {
                const error = new Error(
                    "Cannot start maintenance while the vehicle is on a mission"
                );
                error.statusCode = 400;
                throw error;
            }

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
