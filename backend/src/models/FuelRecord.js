const mongoose = require("mongoose");

const fuelRecordSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true
    },
    worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    quantity: {
        type: Number,
        required: true,
        min: 0.1
    },
    isFullTank: {
        type: Boolean,
        default: false
    },
    fuelLevelAfter: {
        type: Number,
        min: 0,
        required: true
    },
    mileage: {
        type: Number,
        required: true,
        min: 0
    },
    photo: {
        type: String,
        default: ""
    },
    location: {
        latitude: Number,
        longitude: Number
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("FuelRecord", fuelRecordSchema);
