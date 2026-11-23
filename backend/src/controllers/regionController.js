const mongoose = require("mongoose");
const Region = require("../models/Region");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");

const getRegions = async (req, res) => {
    try {
        let regions;

        if (req.user.role === "general_director") {
            regions = await Region.find().sort({ createdAt: -1 });
        } else if (req.user.region) {
            regions = await Region.find({
                _id: req.user.region
            });
        } else {
            regions = [];
        }

        return res.json(regions);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

async function findRegionalDirector(directorId) {
    if (!directorId) return null;

    if (!mongoose.Types.ObjectId.isValid(directorId)) {
        throw new Error("Select a valid Regional Director");
    }

    const director = await User.findOne({
        _id: directorId,
        role: "regional_director"
    });

    if (!director) {
        throw new Error("The selected account is not a Regional Director");
    }

    return director;
}

async function assignRegionalDirector(regionId, directorId, director) {
    if (directorId === undefined) return;

    await User.updateMany(
        {
            role: "regional_director",
            region: regionId,
            ...(director ? { _id: { $ne: director._id } } : {})
        },
        {
            $set: { region: null }
        }
    );

    if (director) {
        director.region = regionId;
        await director.save();
    }
}

const createRegion = async (req, res) => {
    try {
        const {
            name,
            location,
            address,
            status,
            assignedDirectorId
        } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof location !== "string" ||
            !location.trim()
        ) {
            return res.status(400).json({
                message: "Region name and location are required"
            });
        }

        if (
            status !== undefined &&
            !["active", "inactive"].includes(status)
        ) {
            return res.status(400).json({
                message: "Status must be active or inactive"
            });
        }

        const director = await findRegionalDirector(assignedDirectorId);

        const region = await Region.create({
            name,
            location,
            address,
            status
        });

        await assignRegionalDirector(
            region._id,
            assignedDirectorId,
            director
        );

        return res.status(201).json(region);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

const updateRegion = async (req, res) => {
    try {
        const {
            name,
            location,
            address,
            status,
            assignedDirectorId
        } = req.body;

        const region = await Region.findById(req.params.id);

        if (!region) {
            return res.status(404).json({
                message: "Region not found"
            });
        }

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    message: "Region name cannot be empty"
                });
            }
            region.name = name;
        }

        if (location !== undefined) {
            if (typeof location !== "string" || !location.trim()) {
                return res.status(400).json({
                    message: "Region location cannot be empty"
                });
            }
            region.location = location;
        }

        if (address !== undefined) region.address = address;

        if (status !== undefined) {
            if (!["active", "inactive"].includes(status)) {
                return res.status(400).json({
                    message: "Status must be active or inactive"
                });
            }
            region.status = status;
        }

        const director = await findRegionalDirector(assignedDirectorId);

        await region.save();

        await assignRegionalDirector(
            region._id,
            assignedDirectorId,
            director
        );

        return res.json(region);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

const deleteRegion = async (req, res) => {
    try {
        const region = await Region.findById(req.params.id);

        if (!region) {
            return res.status(404).json({
                message: "Region not found"
            });
        }

        const [vehicleCount, userCount] = await Promise.all([
            Vehicle.countDocuments({ region: region._id }),
            User.countDocuments({ region: region._id })
        ]);

        if (vehicleCount > 0 || userCount > 0) {
            return res.status(409).json({
                message: "Cannot delete a region that has vehicles or assigned users"
            });
        }

        await region.deleteOne();

        return res.json({
            message: "Region deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getRegions,
    createRegion,
    updateRegion,
    deleteRegion
};
