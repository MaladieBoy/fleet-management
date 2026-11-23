const mongoose = require("mongoose");

const regionSchema = new mongoose.Schema({
    regionId: {
        type: String,
        unique: true,
        immutable: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        trim: true,
        default: ""
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }
}, {
    timestamps: true
});

regionSchema.pre("save", async function () {
    if (!this.isNew || this.regionId) return;

    const counter = await mongoose.connection
        .collection("regionCounters")
        .findOneAndUpdate(
            { _id: "regionId" },
            { $inc: { seq: 1 } },
            { returnDocument: "after" }
        );

    this.regionId = `REG-${String(counter.seq).padStart(3, "0")}`;
});

module.exports = mongoose.model("Region", regionSchema);
