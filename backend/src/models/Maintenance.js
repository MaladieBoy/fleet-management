const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            "Oil Change",
            "Repair",
            "Inspection",
            "Tire Replacement",
            "Other"
        ]
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    mileage: {
        type: Number,
        required: true,
        min: 0
    },
    cost: {
        type: Number,
        default: 0,
        min: 0
    },
    serviceProvider: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["scheduled", "in_progress", "completed", "cancelled"],
        default: "scheduled"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Maintenance", maintenanceSchema);
