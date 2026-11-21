const Region = require("../models/Region");

const getRegions = async (req, res) => {
    try {
        const regions = await Region.find();
        res.json(regions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createRegion = async (req, res) => {
    try {
        const region = await Region.create(req.body);
        res.status(201).json(region);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getRegions,
    createRegion
};
