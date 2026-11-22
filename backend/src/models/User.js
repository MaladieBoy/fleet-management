const mongoose = require("mongoose");

const userRoles = [
    "general_director",
    "regional_director",
    "driver"
];

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        trim: true,
        default: ""
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    role: {
        type: String,
        enum: userRoles,
        required: true
    },
    region: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region",
        default: null,
        required: function () {
            return this.role !== "general_director";
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);
