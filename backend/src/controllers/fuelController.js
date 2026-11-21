const mongoose = require("mongoose");
const FuelRecord = require("../models/FuelRecord");
const Vehicle = require("../models/Vehicle");

const addFuelRecord = async (req, res) => {
    let session;

    try {
        const {
            vehicle,
            worker,
            quantity,
            fuelLevelAfter,
            isFullTank,
            mileage,
            photo,
            location,
            date
        } = req.body || {};

        if (!vehicle || !mongoose.Types.ObjectId.isValid(vehicle)) {
            return res.status(400).json({ message: "A valid vehicle ID is required" });
        }

        if (
            quantity === undefined || quantity === null || quantity === "" ||
            fuelLevelAfter === undefined || fuelLevelAfter === null || fuelLevelAfter === "" ||
            mileage === undefined || mileage === null || mileage === ""
        ) {
            return res.status(400).json({
                message: "Quantity, fuel level after refueling, and mileage are required"
            });
        }

        const numericQuantity = Number(quantity);
        const numericFuelLevel = Number(fuelLevelAfter);
        const numericMileage = Number(mileage);

        if (
            !Number.isFinite(numericQuantity) ||
            !Number.isFinite(numericFuelLevel) ||
            !Number.isFinite(numericMileage) ||
            numericQuantity < 0.1 ||
            numericFuelLevel < 0 ||
            numericMileage < 0
        ) {
            return res.status(400).json({
                message: "Fuel quantity, fuel level, or mileage is invalid"
            });
        }

        if (worker && !mongoose.Types.ObjectId.isValid(worker)) {
            return res.status(400).json({ message: "Invalid worker ID" });
        }

        if (isFullTank !== undefined && typeof isFullTank !== "boolean") {
            return res.status(400).json({
                message: "isFullTank must be a boolean"
            });
        }

        session = await mongoose.startSession();

        let createdFuelRecord;

        await session.withTransaction(async () => {
            const existingVehicle = await Vehicle.findById(vehicle).session(session);

            if (!existingVehicle) {
                const error = new Error("Vehicle not found");
                error.statusCode = 404;
                throw error;
            }

            if (existingVehicle.fuelType === "Electric") {
                const error = new Error(
                    "Fuel records cannot be created for electric vehicles"
                );
                error.statusCode = 400;
                throw error;
            }

            if (existingVehicle.fuelTankCapacity <= 0) {
                const error = new Error(
                    "Vehicle fuel tank capacity is not configured"
                );
                error.statusCode = 400;
                throw error;
            }

            if (numericQuantity > existingVehicle.fuelTankCapacity) {
                const error = new Error(
                    "Refueling quantity exceeds the tank capacity"
                );
                error.statusCode = 400;
                throw error;
            }

            if (numericFuelLevel > existingVehicle.fuelTankCapacity) {
                const error = new Error(
                    "Fuel level exceeds the tank capacity"
                );
                error.statusCode = 400;
                throw error;
            }

            if (
                isFullTank === true &&
                Math.abs(numericFuelLevel - existingVehicle.fuelTankCapacity) > 0.01
            ) {
                const error = new Error(
                    "A full-tank record must have a fuel level equal to tank capacity"
                );
                error.statusCode = 400;
                throw error;
            }

            if (numericMileage < existingVehicle.mileage) {
                const error = new Error(
                    "Mileage cannot be lower than the vehicle's current mileage"
                );
                error.statusCode = 400;
                throw error;
            }

            const [fuelRecord] = await FuelRecord.create([{
                vehicle,
                worker: worker || null,
                quantity: numericQuantity,
                fuelLevelAfter: numericFuelLevel,
                isFullTank,
                mileage: numericMileage,
                photo,
                location,
                date
            }], { session });

            existingVehicle.currentFuelLevel = numericFuelLevel;
            existingVehicle.mileage = numericMileage;

            await existingVehicle.save({ session });

            createdFuelRecord = fuelRecord;
        });

        res.status(201).json(createdFuelRecord);
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

const getFuelHistory = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.vehicleId);

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        const records = await FuelRecord.find({
            vehicle: req.params.vehicleId
        }).sort({ date: -1 });

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const calculateFuelConsumption = async (req, res) => {
    try {
        const vehicleId = req.params.vehicleId;

        if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
            return res.status(400).json({ message: "Invalid vehicle ID" });
        }

        const vehicle = await Vehicle.findById(vehicleId);

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        const records = await FuelRecord.find({
            vehicle: vehicleId
        }).sort({ date: 1, _id: 1 });

        const fullTankIndexes = [];

        records.forEach((record, index) => {
            if (record.isFullTank) {
                fullTankIndexes.push(index);
            }
        });

        if (fullTankIndexes.length < 2) {
            return res.json({
                message: "At least two full-tank records are required",
                consumption: null
            });
        }

        const results = [];

        for (let i = 1; i < fullTankIndexes.length; i++) {
            const previousIndex = fullTankIndexes[i - 1];
            const currentIndex = fullTankIndexes[i];

            const previous = records[previousIndex];
            const current = records[currentIndex];

            const distance = current.mileage - previous.mileage;

            if (distance <= 0) {
                continue;
            }

            let fuelUsed = 0;
            let refuelingRecordsCount = 0;

            for (let j = previousIndex + 1; j <= currentIndex; j++) {
                fuelUsed += records[j].quantity;
                refuelingRecordsCount++;
            }

            const consumption = (fuelUsed / distance) * 100;

            results.push({
                fromMileage: previous.mileage,
                toMileage: current.mileage,
                distance,
                fuelUsed: Number(fuelUsed.toFixed(2)),
                refuelingRecordsCount,
                consumption: Number(consumption.toFixed(2))
            });
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getVehicleFuelConsumption = async (req, res) => {
    try {
        const vehicleId = req.params.vehicleId;

        if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
            return res.status(400).json({ message: "Invalid vehicle ID" });
        }

        const vehicle = await Vehicle.findById(vehicleId);

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        const records = await FuelRecord.find({
            vehicle: vehicleId
        }).sort({ date: 1, _id: 1 });

        const fullTankIndexes = [];

        records.forEach((record, index) => {
            if (record.isFullTank) {
                fullTankIndexes.push(index);
            }
        });

        let totalDistance = 0;
        let totalFuelUsed = 0;
        let completedIntervals = 0;

        for (let i = 1; i < fullTankIndexes.length; i++) {
            const previousIndex = fullTankIndexes[i - 1];
            const currentIndex = fullTankIndexes[i];

            const previous = records[previousIndex];
            const current = records[currentIndex];
            const distance = current.mileage - previous.mileage;

            if (distance <= 0) {
                continue;
            }

            let fuelUsed = 0;

            for (let j = previousIndex + 1; j <= currentIndex; j++) {
                fuelUsed += records[j].quantity;
            }

            totalDistance += distance;
            totalFuelUsed += fuelUsed;
            completedIntervals++;
        }

        const averageConsumption = totalDistance > 0
            ? Number(((totalFuelUsed / totalDistance) * 100).toFixed(2))
            : null;

        const totalFuelAdded = records.reduce(
            (total, record) => total + record.quantity,
            0
        );

        const latestRecord = records.length > 0
            ? records[records.length - 1]
            : null;

        res.json({
            vehicle: {
                id: vehicle._id,
                registrationNumber: vehicle.registrationNumber,
                mileage: vehicle.mileage,
                currentFuelLevel: vehicle.currentFuelLevel,
                fuelTankCapacity: vehicle.fuelTankCapacity
            },
            totalRefuelingRecords: records.length,
            fullTankRecords: fullTankIndexes.length,
            totalFuelAdded: Number(totalFuelAdded.toFixed(2)),
            completedIntervals,
            totalDistanceBetweenFullTanks: totalDistance,
            totalFuelUsedBetweenFullTanks: Number(totalFuelUsed.toFixed(2)),
            averageConsumption,
            lastRefuelingDate: latestRecord ? latestRecord.date : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getFuelConsumptionReport = async (req, res) => {
    try {
        const vehicleId = req.params.vehicleId;

        if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
            return res.status(400).json({ message: "Invalid vehicle ID" });
        }

        const vehicle = await Vehicle.findById(vehicleId);

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        const records = await FuelRecord.find({
            vehicle: vehicleId
        }).sort({ date: 1, _id: 1 });

        const fullTankIndexes = [];

        records.forEach((record, index) => {
            if (record.isFullTank) {
                fullTankIndexes.push(index);
            }
        });

        const consumptionIntervals = [];

        for (let i = 1; i < fullTankIndexes.length; i++) {
            const previousIndex = fullTankIndexes[i - 1];
            const currentIndex = fullTankIndexes[i];

            const previous = records[previousIndex];
            const current = records[currentIndex];
            const distance = current.mileage - previous.mileage;

            if (distance <= 0) {
                continue;
            }

            let fuelUsed = 0;
            let refuelingRecordsCount = 0;

            for (let j = previousIndex + 1; j <= currentIndex; j++) {
                fuelUsed += records[j].quantity;
                refuelingRecordsCount++;
            }

            consumptionIntervals.push({
                fromMileage: previous.mileage,
                toMileage: current.mileage,
                distance,
                fuelUsed: Number(fuelUsed.toFixed(2)),
                refuelingRecordsCount,
                consumption: Number(((fuelUsed / distance) * 100).toFixed(2))
            });
        }

        const totalDistance = consumptionIntervals.reduce(
            (total, interval) => total + interval.distance, 0
        );

        const totalFuelUsed = consumptionIntervals.reduce(
            (total, interval) => total + interval.fuelUsed, 0
        );

        const totalFuelAdded = records.reduce(
            (total, record) => total + record.quantity, 0
        );

        const latestRecord = records.length > 0
            ? records[records.length - 1]
            : null;

        res.json({
            generatedAt: new Date(),
            vehicle: {
                id: vehicle._id,
                registrationNumber: vehicle.registrationNumber,
                brand: vehicle.brand,
                model: vehicle.model,
                mileage: vehicle.mileage,
                fuelType: vehicle.fuelType,
                currentFuelLevel: vehicle.currentFuelLevel,
                fuelTankCapacity: vehicle.fuelTankCapacity
            },
            summary: {
                totalRefuelingRecords: records.length,
                fullTankRecords: fullTankIndexes.length,
                totalFuelAdded: Number(totalFuelAdded.toFixed(2)),
                completedIntervals: consumptionIntervals.length,
                totalDistanceBetweenFullTanks: totalDistance,
                totalFuelUsedBetweenFullTanks: Number(totalFuelUsed.toFixed(2)),
                averageConsumption: totalDistance > 0
                    ? Number(((totalFuelUsed / totalDistance) * 100).toFixed(2))
                    : null,
                lastRefuelingDate: latestRecord ? latestRecord.date : null
            },
            consumptionIntervals,
            fuelRecords: records
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addFuelRecord,
    getFuelHistory,
    calculateFuelConsumption,
    getVehicleFuelConsumption,
    getFuelConsumptionReport
};
