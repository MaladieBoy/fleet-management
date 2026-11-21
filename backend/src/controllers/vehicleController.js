const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");
const Region = require("../models/Region");

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
        const body = req.body;

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return res.status(400).json({
                message: "A valid JSON object is required"
            });
        }

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
            "technicalInspectionExpiry",
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

        const requiredFields = [
            "registrationNumber",
            "brand",
            "model",
            "type",
            "fuelType",
            "region"
        ];

        const missingFields = requiredFields.filter(
            field => typeof body[field] !== "string" || !body[field].trim()
        );

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Required fields are missing or invalid: ${missingFields.join(", ")}`
            });
        }

        const vehicleStatuses = [
            "available",
            "on_mission",
            "at_parking",
            "under_maintenance",
            "out_of_service"
        ];

        const fuelTypes = ["Diesel", "Petrol", "Electric"];

        if (!fuelTypes.includes(body.fuelType)) {
            return res.status(400).json({
                message: "Fuel type must be Diesel, Petrol, or Electric"
            });
        }

        const status = body.status === undefined
            ? "at_parking"
            : body.status;

        if (!vehicleStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid vehicle status"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(body.region)) {
            return res.status(400).json({
                message: "Invalid region ID"
            });
        }

        const regionExists = await Region.exists({ _id: body.region });

        if (!regionExists) {
            return res.status(404).json({
                message: "Region not found"
            });
        }

        if (body.year !== undefined) {
            if (
                typeof body.year !== "number" ||
                !Number.isInteger(body.year) ||
                body.year < 1900 ||
                body.year > new Date().getFullYear()
            ) {
                return res.status(400).json({
                    message: "Year must be a valid year between 1900 and the current year"
                });
            }
        }

        const numericFields = [
            "fuelTankCapacity",
            "mileage",
            "currentFuelLevel"
        ];

        for (const field of numericFields) {
            if (
                body[field] !== undefined &&
                (typeof body[field] !== "number" ||
                    !Number.isFinite(body[field]) ||
                    body[field] < 0)
            ) {
                return res.status(400).json({
                    message: `${field} must be a non-negative number`
                });
            }
        }

        const fuelTankCapacity = body.fuelTankCapacity ?? 0;
        const currentFuelLevel = body.currentFuelLevel ?? 0;
        const mileage = body.mileage ?? 0;

        if (body.fuelType !== "Electric" && fuelTankCapacity <= 0) {
            return res.status(400).json({
                message: "Diesel and petrol vehicles must have a positive fuel tank capacity"
            });
        }

        if (body.fuelType === "Electric" &&
            (fuelTankCapacity !== 0 || currentFuelLevel !== 0)) {
            return res.status(400).json({
                message: "Electric vehicles must have zero fuel tank capacity and fuel level"
            });
        }

        if (currentFuelLevel > fuelTankCapacity) {
            return res.status(400).json({
                message: "Current fuel level cannot exceed tank capacity"
            });
        }

        for (const field of ["registrationNumber", "brand", "model", "type", "photo"]) {
            if (body[field] !== undefined && typeof body[field] !== "string") {
                return res.status(400).json({
                    message: `${field} must be a string`
                });
            }
        }

        const dateFields = ["insuranceExpiry", "technicalInspectionExpiry"];

        for (const field of dateFields) {
            if (body[field] !== undefined && body[field] !== null) {
                const date = new Date(body[field]);

                if (Number.isNaN(date.getTime())) {
                    return res.status(400).json({
                        message: `${field} must be a valid date`
                    });
                }
            }
        }

        const vehicle = new Vehicle({
            registrationNumber: body.registrationNumber.trim().toUpperCase(),
            brand: body.brand.trim(),
            model: body.model.trim(),
            type: body.type.trim(),
            year: body.year,
            fuelType: body.fuelType,
            fuelTankCapacity,
            mileage,
            currentFuelLevel,
            region: body.region,
            photo: body.photo?.trim() || "",
            insuranceExpiry: body.insuranceExpiry,
            technicalInspectionExpiry: body.technicalInspectionExpiry,
            status,
            statusHistory: [{
                status,
                note: "Vehicle created"
            }]
        });

        await vehicle.save();

        res.status(201).json(vehicle);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A vehicle with this registration number already exists"
            });
        }

        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ message: error.message });
        }

        res.status(500).json({ message: error.message });
    }
};

const updateVehicle = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid vehicle ID" });
        }

        const body = req.body;

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return res.status(400).json({
                message: "A valid JSON object is required"
            });
        }

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

        const unsupportedFields = Object.keys(body).filter(
            field => !allowedFields.includes(field)
        );

        if (unsupportedFields.length > 0) {
            return res.status(400).json({
                message: `Unsupported fields: ${unsupportedFields.join(", ")}`
            });
        }

        const fieldsToUpdate = Object.keys(body);

        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({
                message: "No vehicle fields provided"
            });
        }

        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        const stringFields = [
            "registrationNumber",
            "brand",
            "model",
            "type",
            "photo"
        ];

        for (const field of stringFields) {
            if (body[field] !== undefined) {
                if (typeof body[field] !== "string") {
                    return res.status(400).json({
                        message: `${field} must be a string`
                    });
                }

                if (field !== "photo" && !body[field].trim()) {
                    return res.status(400).json({
                        message: `${field} cannot be empty`
                    });
                }
            }
        }

        const numericFields = [
            "fuelTankCapacity",
            "currentFuelLevel",
            "mileage"
        ];

        for (const field of numericFields) {
            if (
                body[field] !== undefined &&
                (typeof body[field] !== "number" ||
                    !Number.isFinite(body[field]) ||
                    body[field] < 0)
            ) {
                return res.status(400).json({
                    message: `${field} must be a non-negative number`
                });
            }
        }

        if (body.year !== undefined) {
            if (
                typeof body.year !== "number" ||
                !Number.isInteger(body.year) ||
                body.year < 1900 ||
                body.year > new Date().getFullYear()
            ) {
                return res.status(400).json({
                    message: "Year must be a valid year between 1900 and the current year"
                });
            }
        }

        if (
            body.fuelType !== undefined &&
            !["Diesel", "Petrol", "Electric"].includes(body.fuelType)
        ) {
            return res.status(400).json({
                message: "Fuel type must be Diesel, Petrol, or Electric"
            });
        }

        if (body.region !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(body.region)) {
                return res.status(400).json({
                    message: "Invalid region ID"
                });
            }

            const regionExists = await Region.exists({ _id: body.region });

            if (!regionExists) {
                return res.status(404).json({
                    message: "Region not found"
                });
            }
        }

        const dateFields = [
            "insuranceExpiry",
            "technicalInspectionExpiry"
        ];

        for (const field of dateFields) {
            if (body[field] !== undefined && body[field] !== null) {
                const date = new Date(body[field]);

                if (Number.isNaN(date.getTime())) {
                    return res.status(400).json({
                        message: `${field} must be a valid date`
                    });
                }
            }
        }

        if (
            body.mileage !== undefined &&
            body.mileage < vehicle.mileage
        ) {
            return res.status(400).json({
                message: "Vehicle mileage cannot be lower than its current mileage"
            });
        }

        const resultingFuelType = body.fuelType ?? vehicle.fuelType;
        const resultingTankCapacity =
            body.fuelTankCapacity ?? vehicle.fuelTankCapacity;
        const resultingFuelLevel =
            body.currentFuelLevel ?? vehicle.currentFuelLevel;

        if (resultingFuelType === "Electric") {
            if (resultingTankCapacity !== 0 || resultingFuelLevel !== 0) {
                return res.status(400).json({
                    message: "Electric vehicles must have zero fuel tank capacity and fuel level"
                });
            }
        } else if (resultingTankCapacity <= 0) {
            return res.status(400).json({
                message: "Diesel and petrol vehicles must have a positive fuel tank capacity"
            });
        }

        if (resultingFuelLevel > resultingTankCapacity) {
            return res.status(400).json({
                message: "Current fuel level cannot exceed tank capacity"
            });
        }

        for (const field of fieldsToUpdate) {
            vehicle[field] = body[field];
        }

        if (body.registrationNumber !== undefined) {
            vehicle.registrationNumber = body.registrationNumber.trim().toUpperCase();
        }

        for (const field of ["brand", "model", "type", "photo"]) {
            if (body[field] !== undefined) {
                vehicle[field] = body[field].trim();
            }
        }

        await vehicle.save();

        await vehicle.populate("region");

        res.json(vehicle);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A vehicle with this registration number already exists"
            });
        }

        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ message: error.message });
        }

        res.status(500).json({ message: error.message });
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
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid vehicle ID" });
        }

        const body = req.body;

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return res.status(400).json({
                message: "A valid JSON object is required"
            });
        }

        const unsupportedFields = Object.keys(body).filter(
            field => !["status", "note"].includes(field)
        );

        if (unsupportedFields.length > 0) {
            return res.status(400).json({
                message: `Unsupported fields: ${unsupportedFields.join(", ")}`
            });
        }

        const allowedStatuses = [
            "available",
            "on_mission",
            "at_parking",
            "under_maintenance",
            "out_of_service"
        ];

        const { status, note = "" } = body;

        if (typeof status !== "string" || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid vehicle status"
            });
        }

        if (typeof note !== "string" || note.length > 500) {
            return res.status(400).json({
                message: "Note must be a string of at most 500 characters"
            });
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
            note: note.trim()
        });

        await vehicle.save();

        res.json(vehicle);
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ message: error.message });
        }

        res.status(500).json({ message: error.message });
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
