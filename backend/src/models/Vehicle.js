const mongoose = require("mongoose");

const vehicleStatuses = [
    "available",
    "on_mission",
    "at_parking",
    "under_maintenance",
    "out_of_service"
];

const vehicleSchema = new mongoose.Schema({
    registrationNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    brand: {
        type: String,
        required: true,
        trim: true
    },
    model: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        min: 1900,
        max: new Date().getFullYear()
    },
    fuelType: {
        type: String,
        enum: ["Diesel", "Petrol", "Electric"],
        required: true
    },
    fuelTankCapacity: {
        type: Number,
        min: 0,
        default: 0
    },
    mileage: {
        type: Number,
        min: 0,
        default: 0
    },
    currentFuelLevel: {
        type: Number,
        min: 0,
        default: 0
    },
    region: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region",
        required: true
    },
    assignedWorker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    photo: {
        type: String,
        default: ""
    },
    insuranceExpiry: {
        type: Date
    },
    technicalInspectionExpiry: {
        type: Date
    },
    status: {
        type: String,
        enum: vehicleStatuses,
        default: "at_parking"
    },
    statusHistory: [{
        status: {
            type: String,
            enum: vehicleStatuses,
            required: true
        },
        changedAt: {
            type: Date,
            default: Date.now
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        note: {
            type: String,
            default: ""
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
