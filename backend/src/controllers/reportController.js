const mongoose = require("mongoose");

const {
    buildVehicleStatistics
} = require("../services/vehicleStatisticsService");

const {
    streamVehicleStatisticsPDF
} = require("../services/pdfReportService");

const getVehicleStatistics = async (req, res) => {
    try {
        const regionId = req.query.region || null;

        if (regionId && !mongoose.Types.ObjectId.isValid(regionId)) {
            return res.status(400).json({
                message: "Invalid region ID"
            });
        }

        const statistics = await buildVehicleStatistics(regionId);

        res.json(statistics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const downloadVehicleStatisticsPDF = async (req, res) => {
    try {
        const regionId = req.query.region || null;

        if (regionId && !mongoose.Types.ObjectId.isValid(regionId)) {
            return res.status(400).json({
                message: "Invalid region ID"
            });
        }

        const statistics = await buildVehicleStatistics(regionId);

        streamVehicleStatisticsPDF(statistics, res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getVehicleStatistics,
    downloadVehicleStatisticsPDF
};
