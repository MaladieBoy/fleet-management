import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

const statusLabels = {
    available: "Disponible au dépôt",
    on_mission: "En mission",
    at_parking: "Au parking",
    under_maintenance: "En maintenance",
    out_of_service: "Hors service"
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
    if (!region) return "Non renseigné";
    if (typeof region === "string") return region;
    return region.name || "Non renseigné";
}

function getRegionId(region) {
    if (!region) return "";
    if (typeof region === "string") return region;
    return region._id || "";
}

function formatMileage(value) {
    return Number(value || 0).toLocaleString("fr-FR") + " km";
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
                        "Impossible de charger l'historique."
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
        if (!value) return "Date inconnue";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "Date inconnue";

        return date.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatExpiry(value) {
        if (!value) return "Non renseignée";

        return new Date(value).toLocaleDateString("fr-FR");
    }

    return (
        <div className="vehicle-modal-overlay" onMouseDown={onClose}>
            <div
                className="vehicle-modal vehicle-details-modal"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="vehicle-modal-header">
                    <div>
                        <span className="modal-eyebrow">FICHE VÉHICULE</span>
                        <h2>{vehicle.registrationNumber}</h2>
                        <span className="modal-subtitle">
                            {vehicle.brand} {vehicle.model}
                        </span>
                    </div>

                    <button
                        type="button"
                        className="icon-button"
                        onClick={onClose}
                        aria-label="Fermer"
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
                            <span>{vehicle.type} · {vehicle.year || "Année inconnue"}</span>
                        </div>

                        <span className={`status-badge ${getStatusClass(vehicle.status)}`}>
                            <span />
                            {statusLabels[vehicle.status] || vehicle.status}
                        </span>
                    </div>

                    <div className="vehicle-detail-section">
                        <h3>Identification & exploitation</h3>

                        <div className="vehicle-detail-grid">
                            <div>
                                <span>IMMATRICULATION</span>
                                <strong className="detail-mono">
                                    {vehicle.registrationNumber}
                                </strong>
                            </div>

                            <div>
                                <span>RÉGION / DÉPÔT</span>
                                <strong>{getRegionName(vehicle.region)}</strong>
                            </div>

                            <div>
                                <span>GOUVERNORAT</span>
                                <strong>
                                    {vehicle.region?.governorate || "Non renseigné"}
                                </strong>
                            </div>

                            <div>
                                <span>STATUT OPÉRATIONNEL</span>
                                <strong>
                                    {statusLabels[vehicle.status] || vehicle.status}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="vehicle-detail-section">
                        <h3>Données techniques</h3>

                        <div className="vehicle-detail-grid">
                            <div>
                                <span>CARBURANT</span>
                                <strong>{vehicle.fuelType || "—"}</strong>
                            </div>

                            <div>
                                <span>KILOMÉTRAGE</span>
                                <strong className="detail-mono">
                                    {formatMileage(vehicle.mileage)}
                                </strong>
                            </div>

                            <div>
                                <span>CAPACITÉ DU RÉSERVOIR</span>
                                <strong>{vehicle.fuelTankCapacity ?? 0} L</strong>
                            </div>

                            <div>
                                <span>NIVEAU DE CARBURANT</span>
                                <strong>
                                    {vehicle.currentFuelLevel ?? 0} L
                                </strong>
                            </div>

                            <div>
                                <span>ASSURANCE</span>
                                <strong>{formatExpiry(vehicle.insuranceExpiry)}</strong>
                            </div>

                            <div>
                                <span>VISITE TECHNIQUE</span>
                                <strong>
                                    {formatExpiry(vehicle.technicalInspectionExpiry)}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="vehicle-detail-section history-section">
                        <div className="history-heading">
                            <h3>Historique des statuts</h3>
                            <span>{history.length} événement(s)</span>
                        </div>

                        {historyLoading && (
                            <div className="history-message">
                                <LoaderCircle size={17} className="loading-spinner" />
                                Chargement de l'historique...
                            </div>
                        )}

                        {historyError && (
                            <div className="history-error">
                                {historyError}
                            </div>
                        )}

                        {!historyLoading && !historyError && history.length === 0 && (
                            <div className="history-message">
                                Aucun changement de statut enregistré.
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
                                                {entry.note || "Aucune note"}
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
                        Fermer
                    </button>

                    <button
                        type="button"
                        className="button-primary"
                        onClick={onEdit}
                    >
                        <Pencil size={15} />
                        Modifier le véhicule
                    </button>
                </div>
            </div>
        </div>
    );
}
function Vehicles() {
    const navigate = useNavigate();
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

    async function loadVehicles() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/vehicles");
            setVehicles(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Impossible de charger les véhicules. Vérifiez la connexion au serveur."
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
        navigate(`/vehicles/${vehicle._id}/edit`);
    }

    return (
        <section className="page-view">
            <div className="page-breadcrumb">
                <span>Fleet & Parc</span>
                <span>/</span>
                <span>Gestion du parc roulant</span>
                <span>/</span>
                <span className="breadcrumb-current">Véhicules</span>
            </div>

            <div className="page-heading page-heading-actions">
                <div>
                    <div className="page-eyebrow">
                        <span className="eyebrow-dot" />
                        NŒUD RÉGIONAL TN-01
                        <span className="eyebrow-separator">/</span>
                        GESTION DU PARC ROULANT
                    </div>

                    <h1>Gestion des Véhicules</h1>

                    <p>
                        Suivi en temps réel et état opérationnel de la flotte.
                    </p>
                </div>

                <div className="page-actions">
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => window.print()}
                    >
                        <Download size={16} />
                        Exporter
                    </button>

                    <button
                        type="button"
                        className="button-primary"
                        onClick={() => navigate("/vehicles/new")}
                    >
                        <Plus size={17} />
                        Nouveau Véhicule
                    </button>
                </div>
            </div>

            <div className="vehicle-kpi-grid">
                <div className="vehicle-kpi-card">
                    <div className="vehicle-kpi-top">
                        <span>TOTAL PARC ROULANT</span>
                        <div className="kpi-icon blue">
                            <Truck size={19} />
                        </div>
                    </div>
                    <div className="vehicle-kpi-value">
                        {loading ? "—" : vehicles.length}
                        <span>véhicules enregistrés</span>
                    </div>
                    <div className="vehicle-kpi-footer">
                        <span className="kpi-dot green-dot" />
                        Registre du parc
                    </div>
                </div>

                <div className="vehicle-kpi-card">
                    <div className="vehicle-kpi-top">
                        <span>ACTUELLEMENT EN MISSION</span>
                        <div className="kpi-icon cyan">
                            <Truck size={19} />
                        </div>
                    </div>
                    <div className="vehicle-kpi-value cyan-text">
                        {loading ? "—" : missionCount}
                        <span>véhicules en mission</span>
                    </div>
                    <div className="vehicle-kpi-footer">
                        Statut opérationnel
                    </div>
                </div>

                <div className="vehicle-kpi-card">
                    <div className="vehicle-kpi-top">
                        <span>DISPONIBILITÉ & MAINTENANCE</span>
                        <div className="kpi-icon green">
                            <Gauge size={19} />
                        </div>
                    </div>
                    <div className="vehicle-kpi-value green-text">
                        {loading ? "—" : availableCount}
                        <span>véhicules disponibles</span>
                    </div>
                    <div className="vehicle-kpi-footer">
                        <span className="maintenance-count">
                            {maintenanceCount} en atelier
                        </span>
                    </div>
                </div>
            </div>

            <div className="vehicle-filter-panel">
                <form className="vehicle-search" onSubmit={handleSearch}>
                    <Search size={17} />
                    <input
                        type="search"
                        placeholder="Rechercher par matricule, marque ou modèle..."
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
                        <option value="">Tous types de véhicules</option>
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
                        <option value="">Tous statuts</option>
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
                        <option value="">Tous carburants</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Petrol">Essence</option>
                        <option value="Electric">Électrique</option>
                    </select>
                </label>

                <label className="vehicle-filter region-filter">
                    <select
                        value={regionFilter}
                        onChange={(event) => setRegionFilter(event.target.value)}
                    >
                        <option value="">Toutes régions</option>
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
                    title="Réinitialiser les filtres"
                    aria-label="Réinitialiser les filtres"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {error && (
                <div className="vehicle-error">
                    <span>{error}</span>
                    <button type="button" onClick={loadVehicles}>
                        Réessayer
                    </button>
                </div>
            )}

            <div className="vehicle-table-panel">
                <div className="vehicle-table-heading">
                    <div>
                        <h2>Inventaire Flotte Active</h2>
                        <span className="vehicle-result-count">
                            Affichage {filteredVehicles.length} sur {vehicles.length}
                        </span>
                    </div>

                    <div className="table-live-status">
                        <span className="online-dot" />
                        Registre Flotte à Jour
                    </div>
                </div>

                <div className="vehicle-table-scroll">
                    <table className="vehicle-table">
                        <thead>
                            <tr>
                                <th>VÉHICULE & MATRICULE</th>
                                <th>TYPE & MODÈLE</th>
                                <th>RÉGION / DÉPÔT</th>
                                <th>DONNÉES TECHNIQUES</th>
                                <th>STATUT OPÉRATIONNEL</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="6" className="table-message">
                                        <LoaderCircle size={22} className="loading-spinner" />
                                        Chargement du parc automobile...
                                    </td>
                                </tr>
                            )}

                            {!loading && !error && filteredVehicles.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="table-message">
                                        Aucun véhicule ne correspond aux filtres.
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
                                                        {vehicle.year || "Année non renseignée"}
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
                                                        ? vehicle.region?.governorate || "Région"
                                                        : "Région"}
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
                                                    title="Voir les détails"
                                                    aria-label="Voir les détails"
                                                    onClick={() => setSelectedVehicle(vehicle)}
                                                >
                                                    <Eye size={17} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="table-action"
                                                    title="Modifier le véhicule"
                                                    aria-label="Modifier le véhicule"
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
                    <span>{filteredVehicles.length} véhicule(s) affiché(s)</span>
                    <button
                        type="button"
                        className="refresh-table-button"
                        onClick={loadVehicles}
                        disabled={loading}
                    >
                        <RefreshCw size={14} />
                        Actualiser
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
        </section>
    );
}

export default Vehicles;
