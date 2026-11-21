const PDFDocument = require("pdfkit");

function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US", {
        maximumFractionDigits: 2
    });
}

function ensureSpace(doc, height = 30) {
    const bottom = doc.page.height - doc.page.margins.bottom;

    if (doc.y + height > bottom) {
        doc.addPage();
    }
}

function addSectionTitle(doc, title) {
    ensureSpace(doc, 38);

    doc.moveDown(0.4);
    doc.font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#1D4ED8")
        .text(title);

    doc.moveDown(0.2);
    doc.y += 1;
}

function addPair(doc, label, value) {
    const left = doc.page.margins.left;
    const availableWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.font("Helvetica-Bold").fontSize(9);
    const labelHeight = doc.heightOfString(String(label), {
        width: 160
    });

    doc.font("Helvetica").fontSize(9);
    const valueHeight = doc.heightOfString(String(value), {
        width: availableWidth - 175
    });

    const rowHeight = Math.max(labelHeight, valueHeight) + 5;

    ensureSpace(doc, rowHeight);

    const y = doc.y;

    doc.font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#374151")
        .text(String(label), left, y, { width: 160 });

    doc.font("Helvetica")
        .fontSize(9)
        .fillColor("#111827")
        .text(String(value), left + 175, y, {
            width: availableWidth - 175
        });

    doc.y = y + rowHeight;

    doc.moveTo(left, doc.y - 3)
        .lineTo(left + availableWidth, doc.y - 3)
        .strokeColor("#E5E7EB")
        .lineWidth(0.5)
        .stroke();
}

function addTableHeader(doc, title) {
    ensureSpace(doc, 40);

    doc.font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#1F2937")
        .text(title);

    doc.moveDown(0.3);
}

function streamVehicleStatisticsPDF(statistics, res) {
    const date = new Date(statistics.generatedAt);
    const dateLabel = date.toISOString().slice(0, 10);
    const filename = `vehicle-statistics-${dateLabel}.pdf`;

    const doc = new PDFDocument({
        size: "A4",
        margins: {
            top: 48,
            bottom: 48,
            left: 48,
            right: 48
        },
        info: {
            Title: "Fleet Management - Vehicle Statistics",
            Author: "Fleet Management System",
            Subject: "Vehicle, fuel and maintenance statistics"
        }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
    );

    doc.on("error", error => {
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        } else {
            res.destroy(error);
        }
    });

    doc.pipe(res);

    doc.font("Helvetica-Bold")
        .fontSize(21)
        .fillColor("#111827")
        .text("Fleet Management Report");

    doc.moveDown(0.4);

    doc.font("Helvetica")
        .fontSize(9)
        .fillColor("#6B7280")
        .text(`Generated at: ${date.toISOString()}`);

    if (statistics.filters.region) {
        doc.text(`Region filter: ${statistics.filters.region}`);
    } else {
        doc.text("Scope: All regions");
    }

    addSectionTitle(doc, "Vehicle Overview");

    addPair(doc, "Total vehicles", statistics.vehicles.total);
    addPair(
        doc,
        "Assigned to workers",
        statistics.vehicles.assignedToWorker
    );
    addPair(doc, "Unassigned vehicles", statistics.vehicles.unassigned);
    addPair(doc, "Total mileage", `${formatNumber(statistics.vehicles.totalMileage)} km`);
    addPair(doc, "Average mileage", `${formatNumber(statistics.vehicles.averageMileage)} km`);

    addSectionTitle(doc, "Vehicles by Status");

    for (const [status, count] of Object.entries(statistics.vehicles.byStatus)) {
        addPair(doc, status.replaceAll("_", " "), count);
    }

    addSectionTitle(doc, "Vehicles by Region");

    if (statistics.vehicles.byRegion.length === 0) {
        addPair(doc, "Regions", "No vehicle records found");
    }

    for (const region of statistics.vehicles.byRegion) {
        addPair(
            doc,
            `${region.regionName} (${region.governorate})`,
            `${region.vehicleCount} vehicle(s)`
        );
    }

    addSectionTitle(doc, "Fuel Statistics");

    addPair(doc, "Refueling records", statistics.fuel.totalRefuelingRecords);
    addPair(doc, "Total fuel added", `${formatNumber(statistics.fuel.totalFuelAdded)} L`);
    addPair(doc, "Full-tank records", statistics.fuel.fullTankRecords);
    addPair(doc, "Completed intervals", statistics.fuel.completedIntervals);
    addPair(
        doc,
        "Distance between full tanks",
        `${formatNumber(statistics.fuel.totalDistanceBetweenFullTanks)} km`
    );
    addPair(
        doc,
        "Fuel used between full tanks",
        `${formatNumber(statistics.fuel.totalFuelUsedBetweenFullTanks)} L`
    );
    addPair(
        doc,
        "Average consumption",
        statistics.fuel.averageConsumption === null
            ? "Not enough full-tank records"
            : `${formatNumber(statistics.fuel.averageConsumption)} L/100 km`
    );

    addSectionTitle(doc, "Maintenance Statistics");

    addPair(doc, "Maintenance records", statistics.maintenance.totalRecords);
    addPair(
        doc,
        "Total recorded cost",
        formatNumber(statistics.maintenance.totalCost)
    );
    addPair(
        doc,
        "Completed maintenance cost",
        formatNumber(statistics.maintenance.completedCost)
    );

    for (const [status, count] of Object.entries(statistics.maintenance.byStatus)) {
        addPair(doc, `Status: ${status.replaceAll("_", " ")}`, count);
    }

    addTableHeader(doc, "Maintenance by Type");

    for (const [type, count] of Object.entries(statistics.maintenance.byType)) {
        addPair(doc, type, count);
    }

    addSectionTitle(doc, "Vehicle Details");

    if (statistics.vehicleOverview.length === 0) {
        addPair(doc, "Vehicles", "No vehicle records found");
    }

    for (const vehicle of statistics.vehicleOverview) {
        addPair(
            doc,
            `${vehicle.registrationNumber} - ${vehicle.brand} ${vehicle.model}`,
            `${vehicle.status} | ${formatNumber(vehicle.mileage)} km | ${vehicle.region}`
        );
    }

    doc.end();
}

module.exports = {
    streamVehicleStatisticsPDF
};
