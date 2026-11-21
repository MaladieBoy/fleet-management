const FuelRecord = require("../models/FuelRecord");
const Vehicle = require("../models/Vehicle");

const addFuelRecord = async (req, res) => {
    try {
        const {
            vehicle,
            quantity,
            fuelLevelAfter,
            isFullTank,
            mileage,
            photo,
            location,
            date
        } = req.body;

        const existingVehicle = await Vehicle.findById(vehicle);

        if (!existingVehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        if (mileage < existingVehicle.mileage) {
            return res.status(400).json({
                message: "Mileage cannot be lower than the vehicle's current mileage"
            });
        }

        if (fuelLevelAfter > existingVehicle.fuelTankCapacity) {
            return res.status(400).json({
                message: "Fuel level exceeds the tank capacity"
            });
        }

        const fuelRecord = await FuelRecord.create({
            vehicle,
            quantity,
            fuelLevelAfter,
            isFullTank,
            mileage,
            photo,
            location,
            date
        });

        existingVehicle.currentFuelLevel = fuelLevelAfter;
        existingVehicle.mileage = mileage;

        await existingVehicle.save();

        res.status(201).json(fuelRecord);
    } catch (error) {
        res.status(400).json({ message: error.message });
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
        const records = await FuelRecord.find({
            vehicle: req.params.vehicleId,
            isFullTank: true
        }).sort({ mileage: 1 });

        if (records.length < 2) {
            return res.json({
                message: "At least two full-tank records are required",
                consumption: null
            });
        }

        const results = [];

        for (let i = 1; i < records.length; i++) {
            const previous = records[i - 1];
            const current = records[i];

            const distance = current.mileage - previous.mileage;

            if (distance <= 0) {
                continue;
            }

            const consumption = (current.quantity / distance) * 100;

            results.push({
                fromMileage: previous.mileage,
                toMileage: current.mileage,
                distance,
                fuelUsed: current.quantity,
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
        const records = await FuelRecord.find({
            vehicle: req.params.vehicleId
        }).sort({ mileage: 1 });

        res.json({
            vehicle: req.params.vehicleId,
            totalRefuelingRecords: records.length,
            fullTankRecords: records.filter(record => record.isFullTank).length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addFuelRecord,
    getFuelHistory,
    calculateFuelConsumption,
    getVehicleFuelConsumption
};
