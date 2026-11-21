const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/database");
const vehicleRoutes = require("./routes/vehicleRoutes");
const regionRoutes = require("./routes/regionRoutes");
const fuelRoutes = require("./routes/fuelRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/vehicles", vehicleRoutes);
app.use("/api/regions", regionRoutes);
app.use("/api/fuel", fuelRoutes);
app.use("/api/maintenance", maintenanceRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Fleet Management API is running"
    });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer();
