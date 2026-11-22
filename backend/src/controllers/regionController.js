const Region = require("../models/Region");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");

const getRegions = async (req, res) => {
    try {
        let regions;

        if (req.user.role === "general_director") {
            regions = await Region.find();
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

const createRegion = async (req, res) => {
    try {
        const { name, governorate, address } = req.body;

        if (!name || !governorate) {
            return res.status(400).json({
                message: "Region name and governorate are required"
            });
        }

        const region = await Region.create({
            name,
            governorate,
            address
        });

        return res.status(201).json(region);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

const updateRegion = async (req, res) => {
    try {
        const { name, governorate, address } = req.body;

        const region = await Region.findById(req.params.id);

        if (!region) {
            return res.status(404).json({
                message: "Region not found"
            });
        }

        if (name !== undefined) region.name = name;
        if (governorate !== undefined) region.governorate = governorate;
        if (address !== undefined) region.address = address;

        await region.save();

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
