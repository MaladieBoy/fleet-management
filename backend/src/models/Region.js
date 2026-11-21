
const mongoose = require("mongoose");

const regionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    governorate: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Region", regionSchema);
