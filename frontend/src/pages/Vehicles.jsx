import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Truck,
    CarFront,
    Bus,
    Plus,
    Download,
    Search,
    SlidersHorizontal,
    RefreshCw,
    Pencil,
    Eye,
    Fuel,
    Gauge,
    X,
    LoaderCircle
} from "lucide-react";
import api from "../services/api";
import VehicleForm from "./VehicleForm";

const statusLabels = {
    available: "Available at Depot",
    on_mission: "On Mission",
    at_parking: "Parked",
    under_maintenance: "Under Maintenance",
    out_of_service: "Out of Service"
};

function getStatusClass(status) {
    return {
        available: "status-available",
        on_mission: "status-mission",
        at_parking: "status-parking",
        under_maintenance: "status-maintenance",
        out_of_service: "status-out"
    }[status] || "status-parking";
}

function getVehicleIcon(type) {
    const value = (type || "").toLowerCase();

    if (value.includes("bus")) return Bus;
    if (value.includes("car") || value.includes("voiture")) return CarFront;

    return Truck;
}

function getRegionName(region) {
    if (!region) return "Not provided";
    if (typeof region === "string") return region;
    return region.name || "Not provided";
}

function getRegionId(region) {
    if (!region) return "";
    if (typeof region === "string") return region;
    return region._id || "";
}

function formatMileage(value) {
    return Number(value || 0).toLocaleString("en-GB") + " km";
}

function VehicleDetails({ vehicle, onClose, onEdit }) {
    const Icon = getVehicleIcon(vehicle.type);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadHistory() {
            try {
                setHistoryLoading(true);
                setHistoryError("");

                const response = await api.get(
                    `/vehicles/${vehicle._id}/history`
                );

                if (active) {
                    setHistory(
                        Array.isArray(response.data) ? [...response.data].reverse() : []
                    );
                }
            } catch (error) {
                if (active) {
                    setHistoryError(
                        error.response?.data?.message ||
                        "Unable to load vehicle history."
                    );
                }
            } finally {
                if (active) setHistoryLoading(false);
            }
        }

        loadHistory();

        return () => {
            active = false;
        };
    }, [vehicle._id]);

    function formatDate(value) {
        if (!value) return "Unknown date";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "Unknown date";

        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatExpiry(value) {
        if (!value) return "Not provided";

        return new Date(value).toLocaleDateString("en-GB");
    }

    return (
        <div className="vehicle-modal-overlay" onMouseDown={onClose}>
            <div
                className="vehicle-modal vehicle-details-modal"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="vehicle-modal-header">
                    <div>
                        <span className="modal-eyebrow">VEHICLE DETAILS</span>
                        <h2>{vehicle.registrationNumber}</h2>
                        <span className="modal-subtitle">
                            {vehicle.brand} {vehicle.model}
                        </span>
                    </div>

                    <button
                        type="button"
                        className="icon-button"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={19} />
                    </button>
                </div>

                <div className="vehicle-modal-body">
                    <div className="vehicle-modal-title">
                        <div className="vehicle-row-icon large">
                            <Icon size={25} />
                        </div>

                        <div>
                            <strong>{vehicle.brand} {vehicle.model}</strong>
                            <span>{vehicle.type} · {vehicle.year || "Year not provided"}</span>
                        </div>

                        <span className={`status-badge ${getStatusClass(vehicle.status)}`}>
                            <span />
                            {statusLabels[vehicle.status] || vehicle.status}
                        </span>
                    </div>

                    <div className="vehicle-detail-section">
                        <h3>Identification & Operations</h3>

                        <div className="vehicle-detail-grid">
                            <div>
                                <span>REGISTRATION NUMBER</span>
                                <strong className="detail-mono">
                                    {vehicle.registrationNumber}
                                </strong>
                            </div>

                            <div>
                                <span>REGION / DEPOT</span>
                                <strong>{getRegionName(vehicle.region)}</strong>
                            </div>

                            <div>
                                <span>LOCATION / CITY</span>
                                <strong>
                                    {vehicle.region?.location || "Not provided"}
                                </strong>
                            </div>

                            <div>
                                <span>OPERATIONAL STATUS</span>
                                <strong>
                                    {statusLabels[vehicle.status] || vehicle.status}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="vehicle-detail-section">
                        <h3>Technical Data</h3>

                        <div className="vehicle-detail-grid">
                            <div>
                                <span>FUEL TYPE</span>
                                <strong>{vehicle.fuelType || "—"}</strong>
                            </div>

                            <div>
                                <span>MILEAGE</span>
                                <strong className="detail-mono">
                                    {formatMileage(vehicle.mileage)}
                                </strong>
                            </div>

                            <div>
                                <span>FUEL TANK CAPACITY</span>
                                <strong>{vehicle.fuelTankCapacity ?? 0} L</strong>
                            </div>

                            <div>
                                <span>NIVEAU DE FUEL TYPE</span>
                                <strong>
                                    {vehicle.currentFuelLevel ?? 0} L
                                </strong>
                            </div>

                            <div>
                                <span>INSURANCE</span>
                                <strong>{formatExpiry(vehicle.insuranceExpiry)}</strong>
                            </div>

                            <div>
                                <span>TECHNICAL INSPECTION</span>
                                <strong>
                                    {formatExpiry(vehicle.technicalInspectionExpiry)}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="vehicle-detail-section history-section">
                        <div className="history-heading">
                            <h3>Status History</h3>
                            <span>{history.length} event(s)</span>
                        </div>

                        {historyLoading && (
                            <div className="history-message">
                                <LoaderCircle size={17} className="loading-spinner" />
                                Loading history...
                            </div>
                        )}

                        {historyError && (
                            <div className="history-error">
                                {historyError}
                            </div>
                        )}

                        {!historyLoading && !historyError && history.length === 0 && (
                            <div className="history-message">
                                No status changes recorded.
                            </div>
                        )}

                        {!historyLoading && !historyError && history.length > 0 && (
                            <div className="status-timeline">
                                {history.map((entry) => (
                                    <div className="timeline-entry" key={entry._id}>
                                        <div className="timeline-marker">
                                            <span className={getStatusClass(entry.status)} />
                                        </div>

                                        <div className="timeline-content">
                                            <div className="timeline-top">
                                                <strong>
                                                    {statusLabels[entry.status] || entry.status}
                                                </strong>
                                                <time>{formatDate(entry.changedAt)}</time>
                                            </div>

                                            <p>
                                                {entry.note || "No note"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="vehicle-modal-footer">
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        className="button-primary"
                        onClick={onEdit}
                    >
                        <Pencil size={15} />
                        Edit Vehicle
                    </button>
                </div>
            </div>
        </div>
    );
}
function Vehicles() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [fuelFilter, setFuelFilter] = useState("");
    const [regionFilter, setRegionFilter] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editingVehicleId, setEditingVehicleId] = useState(null);

    async function loadVehicles() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/vehicles");
            setVehicles(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load vehicles. Check your server connection."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadVehicles();
    }, []);

    useEffect(() => {
        const query = searchParams.get("search") || "";
        setSearch(query);
    }, [searchParams]);

    const regions = useMemo(() => {
        const regionMap = new Map();

        vehicles.forEach((vehicle) => {
            const region = vehicle.region;
            const id = getRegionId(region);
            const name = getRegionName(region);

            if (id && typeof region === "object") {
                regionMap.set(id, name);
            }
        });

        return Array.from(regionMap.entries()).map(([id, name]) => ({
            id,
            name
        }));
    }, [vehicles]);

    const types = useMemo(() => {
        return [...new Set(vehicles.map((vehicle) => vehicle.type).filter(Boolean))]
            .sort();
    }, [vehicles]);

    const filteredVehicles = useMemo(() => {
        const query = search.trim().toLowerCase();

        return vehicles.filter((vehicle) => {
            const matchesSearch = !query || [
                vehicle.registrationNumber,
                vehicle.brand,
                vehicle.model,
                vehicle.type
            ].some((value) => String(value || "").toLowerCase().includes(query));

            const matchesType = !typeFilter || vehicle.type === typeFilter;
            const matchesStatus = !statusFilter || vehicle.status === statusFilter;
            const matchesFuel = !fuelFilter || vehicle.fuelType === fuelFilter;
            const matchesRegion = !regionFilter ||
                getRegionId(vehicle.region) === regionFilter;

            return matchesSearch &&
                matchesType &&
                matchesStatus &&
                matchesFuel &&
                matchesRegion;
        });
    }, [vehicles, search, typeFilter, statusFilter, fuelFilter, regionFilter]);

    const availableCount = vehicles.filter(
        (vehicle) => vehicle.status === "available"
    ).length;

    const missionCount = vehicles.filter(
        (vehicle) => vehicle.status === "on_mission"
    ).length;

    const maintenanceCount = vehicles.filter(
        (vehicle) => vehicle.status === "under_maintenance"
    ).length;

    function handleSearch(event) {
        event.preventDefault();

        if (search.trim()) {
            setSearchParams({ search: search.trim() });
        } else {
            setSearchParams({});
        }
    }

    function resetFilters() {
        setSearch("");
        setTypeFilter("");
        setStatusFilter("");
        setFuelFilter("");
        setRegionFilter("");
        setSearchParams({});
    }

    function handleEdit(vehicle) {
        setSelectedVehicle(null);
        setEditingVehicleId(vehicle._id);
        setFormOpen(true);
    }

    function openCreateForm() {
        setEditingVehicleId(null);
        setFormOpen(true);
    }

    function closeForm() {
        setFormOpen(false);
        setEditingVehicleId(null);
    }

    function handleFormSaved() {
        closeForm();
        loadVehicles();
    }

    return (
        <section className="page-view">
            <div className="page-breadcrumb">
                <span>Fleet & Operations</span>
                <span>/</span>
                <span>Fleet Management</span>
                <span>/</span>
                <span className="breadcrumb-current">Vehicles</span>
            </div>

            <div className="page-heading page-heading-actions">
                <div>
                    <div className="page-eyebrow">
                        <span className="eyebrow-dot" />
                        REGIONAL NODE TN-01
                        <span className="eyebrow-separator">/</span>
                        FLEET MANAGEMENT
                    </div>

                    <h1>Vehicle Management</h1>

                    <p>
                        Real-time fleet monitoring and operational status.
                    </p>
                </div>

                <div className="page-actions">
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => window.print()}
                    >
                        <Download size={16} />
                        Export
                    </button>

                    <button
                        type="button"
                        className="button-primary"
                        onClick={openCreateForm}
                    >
                        <Plus size={17} />
                        Add Vehicle
                    </button>
                </div>
            </div>

            <div className="vehicle-kpi-grid">
                <div className="vehicle-kpi-card">
                    <div className="vehicle-kpi-top">
                        <span>TOTAL FLEET</span>
                        <div className="kpi-icon blue">
                            <Truck size={19} />
                        </div>
                    </div>
                    <div className="vehicle-kpi-value">
                        <strong>{loading ? "—" : vehicles.length}</strong>
                        <span>registered vehicles</span>
                    </div>
                    <div className="vehicle-kpi-footer">
                        <span className="kpi-dot green-dot" />
                        Fleet Register
                    </div>
                </div>

                <div className="vehicle-kpi-card">
                    <div className="vehicle-kpi-top">
                        <span>CURRENTLY ON MISSION</span>
                        <div className="kpi-icon cyan">
                            <Truck size={19} />
                        </div>
                    </div>
                    <div className="vehicle-kpi-value cyan-text">
                        <strong>{loading ? "—" : missionCount}</strong>
                        <span>vehicles on mission</span>
                    </div>
                    <div className="vehicle-kpi-footer">
                        Operational Status
                    </div>
                </div>

                <div className="vehicle-kpi-card">
                    <div className="vehicle-kpi-top">
                        <span>AVAILABILITY & MAINTENANCE</span>
                        <div className="kpi-icon green">
                            <Gauge size={19} />
                        </div>
                    </div>
                    <div className="vehicle-kpi-value green-text">
                        <strong>{loading ? "—" : availableCount}</strong>
                        <span>available vehicles</span>
                    </div>
                    <div className="vehicle-kpi-footer">
                        <span className="maintenance-count">
                            {maintenanceCount} in maintenance
                        </span>
                    </div>
                </div>
            </div>

            <div className="vehicle-filter-panel">
                <form className="vehicle-search" onSubmit={handleSearch}>
                    <Search size={17} />
                    <input
                        type="search"
                        placeholder="Search by registration number, make, or model..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </form>

                <label className="vehicle-filter">
                    <Truck size={16} />
                    <select
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                    >
                        <option value="">All Vehicle Types</option>
                        {types.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </label>

                <label className="vehicle-filter">
                    <SlidersHorizontal size={16} />
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        <option value="">All Statuses</option>
                        {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </label>

                <label className="vehicle-filter fuel-filter">
                    <Fuel size={16} />
                    <select
                        value={fuelFilter}
                        onChange={(event) => setFuelFilter(event.target.value)}
                    >
                        <option value="">All Fuel Types</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Petrol">Petrol</option>
                        <option value="Electric">Electric</option>
                    </select>
                </label>

                <label className="vehicle-filter region-filter">
                    <select
                        value={regionFilter}
                        onChange={(event) => setRegionFilter(event.target.value)}
                    >
                        <option value="">All Regions</option>
                        {regions.map((region) => (
                            <option key={region.id} value={region.id}>
                                {region.name}
                            </option>
                        ))}
                    </select>
                </label>

                <button
                    type="button"
                    className="filter-reset-button"
                    onClick={resetFilters}
                    title="Reset Filters"
                    aria-label="Reset Filters"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {error && (
                <div className="vehicle-error">
                    <span>{error}</span>
                    <button type="button" onClick={loadVehicles}>
                        Retry
                    </button>
                </div>
            )}

            <div className="vehicle-table-panel">
                <div className="vehicle-table-heading">
                    <div>
                        <h2>Active Fleet Inventory</h2>
                        <span className="vehicle-result-count">
                            Showing {filteredVehicles.length} of {vehicles.length}
                        </span>
                    </div>

                    <div className="table-live-status">
                        <span className="online-dot" />
                        Fleet Register Up to Date
                    </div>
                </div>

                <div className="vehicle-table-scroll">
                    <table className="vehicle-table">
                        <thead>
                            <tr>
                                <th>VEHICLE & REGISTRATION</th>
                                <th>TYPE & MODEL</th>
                                <th>REGION / DEPOT</th>
                                <th>TECHNICAL DATA</th>
                                <th>OPERATIONAL STATUS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="6" className="table-message">
                                        <LoaderCircle size={22} className="loading-spinner" />
                                        Loading fleet vehicles...
                                    </td>
                                </tr>
                            )}

                            {!loading && !error && filteredVehicles.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="table-message">
                                        No vehicles match the selected filters.
                                    </td>
                                </tr>
                            )}

                            {!loading && filteredVehicles.map((vehicle) => {
                                const Icon = getVehicleIcon(vehicle.type);

                                return (
                                    <tr key={vehicle._id}>
                                        <td>
                                            <div className="vehicle-identity">
                                                <div className="vehicle-row-icon">
                                                    <Icon size={19} />
                                                </div>
                                                <div>
                                                    <strong className="registration-number">
                                                        {vehicle.registrationNumber}
                                                    </strong>
                                                    <span className="vehicle-reference">
                                                        {vehicle.year || "Year not provided"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="vehicle-model">
                                                <strong>{vehicle.brand} {vehicle.model}</strong>
                                                <span>{vehicle.type}</span>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="vehicle-region">
                                                <strong>{getRegionName(vehicle.region)}</strong>
                                                <span>
                                                    {typeof vehicle.region === "object"
                                                        ? vehicle.region?.location || "Region"
                                                        : "Region"}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="vehicle-technical">
                                                <span>
                                                    <Fuel size={13} />
                                                    {vehicle.fuelType}
                                                </span>
                                                <span>
                                                    <Gauge size={13} />
                                                    {formatMileage(vehicle.mileage)}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <span className={`status-badge ${getStatusClass(vehicle.status)}`}>
                                                <span />
                                                {statusLabels[vehicle.status] || vehicle.status}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="vehicle-actions">
                                                <button
                                                    type="button"
                                                    className="table-action"
                                                    title="View Details"
                                                    aria-label="View Details"
                                                    onClick={() => setSelectedVehicle(vehicle)}
                                                >
                                                    <Eye size={17} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="table-action"
                                                    title="Edit Vehicle"
                                                    aria-label="Edit Vehicle"
                                                    onClick={() => handleEdit(vehicle)}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="vehicle-table-footer">
                    <span>{filteredVehicles.length} vehicle(s) displayed</span>
                    <button
                        type="button"
                        className="refresh-table-button"
                        onClick={loadVehicles}
                        disabled={loading}
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                </div>
            </div>

            {selectedVehicle && (
                <VehicleDetails
                    vehicle={selectedVehicle}
                    onClose={() => setSelectedVehicle(null)}
                    onEdit={() => handleEdit(selectedVehicle)}
                />
            )}

            {formOpen && (
                <div className="vehicle-modal-overlay" onMouseDown={closeForm}>
                    <div
                        className="vehicle-modal vehicle-form-dialog"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <VehicleForm
                            vehicleId={editingVehicleId}
                            onClose={closeForm}
                            onSaved={handleFormSaved}
                        />
                    </div>
                </div>
            )}
        </section>
    );
}

export default Vehicles;
