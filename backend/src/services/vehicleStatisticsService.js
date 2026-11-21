const Vehicle = require("../models/Vehicle");
const Region = require("../models/Region");
const FuelRecord = require("../models/FuelRecord");
const Maintenance = require("../models/Maintenance");

const vehicleStatuses = [
    "available",
    "on_mission",
    "at_parking",
    "under_maintenance",
    "out_of_service"
];

const maintenanceStatuses = [
    "scheduled",
    "in_progress",
    "completed",
    "cancelled"
];

function calculateVehicleFuel(records) {
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

        const distance =
            records[currentIndex].mileage - records[previousIndex].mileage;

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

    return {
        totalRefuelingRecords: records.length,
        fullTankRecords: fullTankIndexes.length,
        totalFuelAdded: records.reduce(
            (total, record) => total + record.quantity, 0
        ),
        completedIntervals,
        totalDistance,
        totalFuelUsed,
        averageConsumption: totalDistance > 0
            ? Number(((totalFuelUsed / totalDistance) * 100).toFixed(2))
            : null
    };
}

async function buildVehicleStatistics(regionId = null) {
    const filter = {};

    if (regionId) {
        filter.region = regionId;
    }

    const vehicles = await Vehicle.find(filter)
        .select(
            "registrationNumber brand model type year fuelType mileage " +
            "currentFuelLevel fuelTankCapacity region assignedWorker status"
        )
        .lean();

    const vehicleIds = vehicles.map(vehicle => vehicle._id);

    const regionIds = [
        ...new Set(
            vehicles
                .filter(vehicle => vehicle.region)
                .map(vehicle => vehicle.region.toString())
        )
    ];

    const [fuelRecords, maintenanceRecords, regions] = await Promise.all([
        FuelRecord.find({ vehicle: { $in: vehicleIds } })
            .sort({ date: 1, _id: 1 })
            .lean(),

        Maintenance.find({ vehicle: { $in: vehicleIds } }).lean(),

        Region.find({ _id: { $in: regionIds } })
            .select("name governorate")
            .lean()
    ]);

    const regionMap = new Map(
        regions.map(region => [region._id.toString(), region])
    );

    const fuelByVehicle = new Map();

    for (const record of fuelRecords) {
        const id = record.vehicle.toString();

        if (!fuelByVehicle.has(id)) {
            fuelByVehicle.set(id, []);
        }

        fuelByVehicle.get(id).push(record);
    }

    const vehiclesByStatus = Object.fromEntries(
        vehicleStatuses.map(status => [status, 0])
    );

    const regionGroups = new Map();

    let assignedVehicles = 0;
    let totalMileage = 0;

    const vehicleOverview = vehicles.map(vehicle => {
        vehiclesByStatus[vehicle.status] =
            (vehiclesByStatus[vehicle.status] || 0) + 1;

        if (vehicle.assignedWorker) {
            assignedVehicles++;
        }

        totalMileage += vehicle.mileage || 0;

        const regionId = vehicle.region
            ? vehicle.region.toString()
            : null;

        const region = regionMap.get(regionId);

        const groupId = regionId || "unassigned";

        if (!regionGroups.has(groupId)) {
            regionGroups.set(groupId, {
                regionId,
                regionName: region ? region.name : "Unassigned region",
                governorate: region ? region.governorate : "",
                vehicleCount: 0
            });
        }

        regionGroups.get(groupId).vehicleCount++;

        return {
            id: vehicle._id,
            registrationNumber: vehicle.registrationNumber,
            brand: vehicle.brand,
            model: vehicle.model,
            type: vehicle.type,
            year: vehicle.year,
            fuelType: vehicle.fuelType,
            mileage: vehicle.mileage,
            status: vehicle.status,
            region: region ? region.name : "Unassigned region",
            assignedWorker: vehicle.assignedWorker || null
        };
    });

    const vehicleFuelSummaries = vehicles.map(vehicle => {
        const records = fuelByVehicle.get(vehicle._id.toString()) || [];

        return {
            vehicleId: vehicle._id,
            registrationNumber: vehicle.registrationNumber,
            ...calculateVehicleFuel(records)
        };
    });

    const totalFuelAdded = fuelRecords.reduce(
        (total, record) => total + record.quantity, 0
    );

    const completedIntervals = vehicleFuelSummaries.reduce(
        (total, item) => total + item.completedIntervals, 0
    );

    const totalFuelDistance = vehicleFuelSummaries.reduce(
        (total, item) => total + item.totalDistance, 0
    );

    const totalFuelUsed = vehicleFuelSummaries.reduce(
        (total, item) => total + item.totalFuelUsed, 0
    );

    const maintenanceByStatus = Object.fromEntries(
        maintenanceStatuses.map(status => [status, 0])
    );

    const maintenanceByType = {};

    let totalMaintenanceCost = 0;
    let completedMaintenanceCost = 0;

    for (const record of maintenanceRecords) {
        maintenanceByStatus[record.status] =
            (maintenanceByStatus[record.status] || 0) + 1;

        maintenanceByType[record.type] =
            (maintenanceByType[record.type] || 0) + 1;

        totalMaintenanceCost += record.cost || 0;

        if (record.status === "completed") {
            completedMaintenanceCost += record.cost || 0;
        }
    }

    return {
        generatedAt: new Date(),

        filters: {
            region: regionId || null
        },

        vehicles: {
            total: vehicles.length,
            byStatus: vehiclesByStatus,
            byRegion: Array.from(regionGroups.values()),
            assignedToWorker: assignedVehicles,
            unassigned: vehicles.length - assignedVehicles,
            totalMileage,
            averageMileage: vehicles.length > 0
                ? Number((totalMileage / vehicles.length).toFixed(2))
                : 0
        },

        fuel: {
            totalRefuelingRecords: fuelRecords.length,
            totalFuelAdded: Number(totalFuelAdded.toFixed(2)),
            fullTankRecords: fuelRecords.filter(
                record => record.isFullTank
            ).length,
            completedIntervals,
            totalDistanceBetweenFullTanks: totalFuelDistance,
            totalFuelUsedBetweenFullTanks: Number(totalFuelUsed.toFixed(2)),
            averageConsumption: totalFuelDistance > 0
                ? Number(((totalFuelUsed / totalFuelDistance) * 100).toFixed(2))
                : null
        },

        maintenance: {
            totalRecords: maintenanceRecords.length,
            totalCost: Number(totalMaintenanceCost.toFixed(2)),
            completedCost: Number(completedMaintenanceCost.toFixed(2)),
            byStatus: maintenanceByStatus,
            byType: maintenanceByType
        },

        vehicleFuelSummaries,
        vehicleOverview
    };
}

module.exports = {
    buildVehicleStatistics
};
