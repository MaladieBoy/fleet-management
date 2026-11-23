import { useEffect, useMemo, useState } from "react";
import {
    Building2,
    Plus,
    RefreshCw,
    LoaderCircle,
    MapPin,
    Search,
    Pencil,
    Trash2,
    X,
    Truck,
    Users,
    Warehouse,
    AlertTriangle
} from "lucide-react";
import api from "../services/api";
import "./Regions.css";

const emptyForm = {
    name: "",
    location: "",
    address: "",
    status: "active",
    assignedDirectorId: ""
};

function getId(value) {
    if (!value) return "";
    return typeof value === "object" ? value._id || "" : value;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getDirectorName(user) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
}

function RegionFormModal({ region, director, directors = [], onClose, onSaved }) {
    const editing = Boolean(region);
    const [form, setForm] = useState(
        region
            ? {
                name: region.name || "",
                location: region.location || "",
                address: region.address || "",
                status: region.status || "active",
                assignedDirectorId: getId(director)
            }
            : emptyForm
    );
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (!form.name.trim() || !form.location.trim()) {
            setError("Region name and location are required.");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                name: form.name.trim(),
                location: form.location.trim(),
                address: form.address.trim(),
                status: form.status,
                assignedDirectorId: form.assignedDirectorId
            };

            if (editing) {
                await api.put(`/regions/${region._id}`, payload);
            } else {
                await api.post("/regions", payload);
            }

            onSaved(editing ? "Region updated successfully." : "Region created successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                `Unable to ${editing ? "update" : "create"} this region.`
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="vehicle-modal-overlay region-modal-overlay" onMouseDown={saving ? undefined : onClose}>
            <div
                className="vehicle-modal region-form-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="region-form-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="vehicle-modal-header">
                    <div>
                        <span className="modal-eyebrow">REGION CONFIGURATION</span>
                        <h2 id="region-form-title">
                            {editing ? "Edit Region" : "Create New Region"}
                        </h2>
                        <span className="modal-subtitle">
                            {editing
                                ? "Update the region's administrative information."
                                : "Register a new operational region."}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="icon-button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                    >
                        <X size={19} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="vehicle-modal-body region-form-body">
                        {error && (
                            <div className="form-alert form-alert-error">
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="region-form-section">
                            <div className="region-form-section-heading">
                                <span>01</span>
                                <div>
                                    <h3>Region Identification</h3>
                                    <p>General information and geographic coverage.</p>
                                </div>
                            </div>

                            <div className="region-form-grid">
                                <label className="form-field">
                                    <span>Region Name *</span>
                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="e.g. Grand Tunis & Cap Bon"
                                        required
                                        disabled={saving}
                                    />
                                </label>

                                <label className="form-field">
                                    <span>Location / City *</span>
                                    <input
                                        name="location"
                                        value={form.location}
                                        onChange={handleChange}
                                        placeholder="e.g. Kairouan"
                                        required
                                        disabled={saving}
                                    />
                                </label>

                                <label className="form-field region-full-field">
                                    <span>Address</span>
                                    <input
                                        name="address"
                                        value={form.address}
                                        onChange={handleChange}
                                        placeholder="Enter the region address"
                                        disabled={saving}
                                    />
                                </label>

                                <label className="form-field">
                                    <span>Region Status *</span>
                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        disabled={saving}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </label>
                                <label className="form-field">
                                    <span>Assigned Regional Director</span>
                                    <select
                                        name="assignedDirectorId"
                                        value={form.assignedDirectorId}
                                        onChange={handleChange}
                                        disabled={saving}
                                    >
                                        <option value="">Unassigned</option>
                                        {directors.map((item) => {
                                            const assignedRegionId = getId(item.region);
                                            const assignedRegionName =
                                                typeof item.region === "object"
                                                    ? item.region?.name
                                                    : "";

                                            const assignedElsewhere =
                                                Boolean(
                                                    assignedRegionId &&
                                                    assignedRegionId !== region?._id
                                                );

                                            return (
                                                <option key={item._id} value={item._id}>
                                                    {getDirectorName(item)} — {item.email}
                                                    {assignedElsewhere
                                                        ? ` (currently assigned: ${assignedRegionName || "another region"})`
                                                        : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <small>
                                        Select an existing account or leave unassigned.
                                        Selecting a director assigned elsewhere moves them here.
                                    </small>
                                </label>
                            </div>

                            <div className="region-form-record-grid">
                                <div>
                                    <span>REGION ID</span>
                                    <strong>{editing ? region.regionId || "—" : "Generated on creation"}</strong>
                                </div>
                                <div>
                                    <span>ASSIGNED REGIONAL DIRECTOR</span>
                                    <strong>{director ? getDirectorName(director) : "Not assigned"}</strong>
                                </div>
                                <div>
                                    <span>CREATION DATE</span>
                                    <strong>{editing ? formatDate(region.createdAt) : "Set automatically"}</strong>
                                </div>
                            </div>

                            {!editing && (
                                <p className="region-form-note">
                                    Region ID and creation date are generated automatically.
                                    Regional Directors are assigned through account management.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="vehicle-modal-footer">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="button-primary" disabled={saving}>
                            {saving
                                ? <LoaderCircle size={15} className="loading-spinner" />
                                : <Plus size={16} />}
                            {saving
                                ? "Saving..."
                                : editing ? "Save Changes" : "Create Region"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DeleteRegionModal({ region, onClose, onDeleted }) {
    const [error, setError] = useState("");
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        try {
            setDeleting(true);
            setError("");
            await api.delete(`/regions/${region._id}`);
            onDeleted("Region deleted successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to delete this region."
            );
            setDeleting(false);
        }
    }

    return (
        <div className="vehicle-modal-overlay region-modal-overlay" onMouseDown={deleting ? undefined : onClose}>
            <div
                className="vehicle-modal region-delete-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="region-delete-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="region-delete-icon">
                    <AlertTriangle size={24} />
                </div>
                <h2 id="region-delete-title">Delete Region</h2>
                <p>
                    Are you sure you want to permanently delete this region?
                    This action cannot be undone.
                </p>

                <div className="region-delete-summary">
                    <span>REGION</span>
                    <strong>{region.name}</strong>
                    <small>{region.location || "Location not provided"}</small>
                </div>

                {error && (
                    <div className="form-alert form-alert-error">
                        <span>{error}</span>
                    </div>
                )}

                <div className="vehicle-modal-footer">
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={onClose}
                        disabled={deleting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="button-danger"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting
                            ? <LoaderCircle size={15} className="loading-spinner" />
                            : <Trash2 size={15} />}
                        Delete Region
                    </button>
                </div>
            </div>
        </div>
    );
}

function Regions() {
    const [regions, setRegions] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let active = true;

        async function loadData() {
            try {
                setLoading(true);
                setError("");

                const [regionResponse, vehicleResponse, userResponse] = await Promise.all([
                    api.get("/regions"),
                    api.get("/vehicles"),
                    api.get("/users")
                ]);

                if (!active) return;

                setRegions(Array.isArray(regionResponse.data) ? regionResponse.data : []);
                setVehicles(Array.isArray(vehicleResponse.data) ? vehicleResponse.data : []);
                setUsers(Array.isArray(userResponse.data) ? userResponse.data : []);
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        "Unable to load region information. Check the server connection."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadData();

        return () => {
            active = false;
        };
    }, [reloadKey]);

    useEffect(() => {
        if (!notice) return undefined;
        const timer = setTimeout(() => setNotice(""), 5000);
        return () => clearTimeout(timer);
    }, [notice]);

    const regionalDirectors = useMemo(
        () => users.filter((user) => user.role === "regional_director"),
        [users]
    );

    const filteredRegions = useMemo(() => {
        const query = search.trim().toLowerCase();

        return regions.filter((region) => {
            const director = regionalDirectors.find(
                (user) => getId(user.region) === region._id
            );

            const searchable = [
                region.regionId,
                region.name,
                region.location,
                region.address,
                region.status,
                director ? getDirectorName(director) : ""
            ];

            return !query || searchable.some((value) =>
                String(value || "").toLowerCase().includes(query)
            );
        });
    }, [regions, regionalDirectors, search]);

    const totalVehicles = vehicles.length;
    const assignedDirectorCount = regions.filter((region) =>
        regionalDirectors.some((user) => getId(user.region) === region._id)
    ).length;
    const regionsWithAddress = regions.filter((region) =>
        String(region.address || "").trim()
    ).length;

    function getRegionDirector(regionId) {
        return regionalDirectors.find((user) =>
            getId(user.region) === regionId
        );
    }

    function reload() {
        setReloadKey((key) => key + 1);
    }

    function handleSaved(message) {
        setModal(null);
        setNotice(message);
        reload();
    }

    return (
        <section className="page-view regions-page">
            <div className="page-breadcrumb">
                <Building2 size={15} />
                <span>Administration</span>
                <span>/</span>
                <span className="breadcrumb-current">Region Management</span>
            </div>

            <div className="page-heading">
                <div>
                    <div className="page-eyebrow">
                        <span className="eyebrow-dot" />
                        HEADQUARTERS / TERRITORIAL ADMINISTRATION
                    </div>
                    <h1>Region Management</h1>
                    <p>
                        Manage operational regions, geographic coverage, depots,
                        and regional assignments.
                    </p>
                </div>

                <div className="page-actions">
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={reload}
                        disabled={loading}
                    >
                        <RefreshCw size={15} />
                        Refresh
                    </button>
                    <button
                        type="button"
                        className="button-primary"
                        onClick={() => setModal({ type: "create" })}
                    >
                        <Plus size={16} />
                        Add Region
                    </button>
                </div>
            </div>

            {notice && (
                <div className="driver-notice" role="status">
                    <span>{notice}</span>
                    <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification">
                        ×
                    </button>
                </div>
            )}

            {error && (
                <div className="vehicle-error">
                    <span>{error}</span>
                    <button type="button" onClick={reload}>Retry</button>
                </div>
            )}

            <div className="region-kpi-grid">
                <div className="region-kpi-card">
                    <div>
                        <span className="region-kpi-label">TOTAL REGIONS</span>
                        <strong>{loading ? "—" : regions.length}</strong>
                        <small>Registered operational regions</small>
                    </div>
                    <span className="region-kpi-icon blue"><Building2 size={20} /></span>
                </div>

                <div className="region-kpi-card">
                    <div>
                        <span className="region-kpi-label">REGISTERED VEHICLES</span>
                        <strong>{loading ? "—" : totalVehicles}</strong>
                        <small>Vehicles across the fleet</small>
                    </div>
                    <span className="region-kpi-icon cyan"><Truck size={20} /></span>
                </div>

                <div className="region-kpi-card">
                    <div>
                        <span className="region-kpi-label">ASSIGNED DIRECTORS</span>
                        <strong>{loading ? "—" : assignedDirectorCount}</strong>
                        <small>Regions with a regional director</small>
                    </div>
                    <span className="region-kpi-icon green"><Users size={20} /></span>
                </div>
            </div>

            <div className="region-table-panel region-list-panel">
                <div className="region-table-heading">
                    <div>
                        <h2>Operational Regions</h2>
                        <p>Region directory and operational assignments.</p>
                    </div>

                    <div className="region-list-tools">
                        <div className="region-search">
                            <Search size={16} />
                            <input
                                type="search"
                                placeholder="Search ID, region, city, address, director..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                aria-label="Search regions"
                            />
                        </div>
                    </div>
                </div>

                <div className="region-table-scroll">
                    <table className="region-table region-management-table">
                        <thead>
                            <tr>
                                <th>REGION ID</th>
                                <th>REGION NAME</th>
                                <th>LOCATION / CITY</th>
                                <th>ADDRESS</th>
                                <th>ASSIGNED REGIONAL DIRECTOR</th>
                                <th>STATUS</th>
                                <th>CREATION DATE</th>
                                <th className="region-actions-cell">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="region-table-message">
                                        <LoaderCircle size={19} className="loading-spinner" />
                                        Loading regions...
                                    </td>
                                </tr>
                            ) : filteredRegions.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="region-table-message">
                                        {regions.length === 0
                                            ? "No regions have been registered yet."
                                            : "No regions match your search."}
                                    </td>
                                </tr>
                            ) : (
                                filteredRegions.map((region) => {
                                    const director = getRegionDirector(region._id);
                                    const status = region.status === "inactive" ? "inactive" : "active";

                                    return (
                                        <tr key={region._id}>
                                            <td className="region-id-cell">
                                                {region.regionId || "—"}
                                            </td>
                                            <td>
                                                <div className="region-name-cell">
                                                    <span className="region-row-icon">
                                                        <MapPin size={16} />
                                                    </span>
                                                    <strong>{region.name}</strong>
                                                </div>
                                            </td>
                                            <td>{region.location || "Not provided"}</td>
                                            <td>
                                                <div className="region-depot-cell">
                                                    <Warehouse size={15} />
                                                    <span>{region.address || "Not provided"}</span>
                                                </div>
                                            </td>
                                            <td>
                                                {director ? (
                                                    <div className="region-director-cell">
                                                        <span className="region-director-avatar">
                                                            {getDirectorName(director).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                                                        </span>
                                                        <span>{getDirectorName(director)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="region-muted">Not assigned</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`region-status-badge ${status}`}>
                                                    {status === "active" ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="region-date-cell">
                                                {formatDate(region.createdAt)}
                                            </td>
                                            <td>
                                                <div className="region-actions">
                                                    <button
                                                        type="button"
                                                        className="table-action"
                                                        title="Edit region"
                                                        aria-label={`Edit ${region.name}`}
                                                        onClick={() => setModal({ type: "edit", region })}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="table-action region-delete-action"
                                                        title="Delete region"
                                                        aria-label={`Delete ${region.name}`}
                                                        onClick={() => setModal({ type: "delete", region })}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="region-table-footer">
                    <span>
                        Showing {filteredRegions.length} of {regions.length} regions
                        {` · ${regionsWithAddress} with a depot address`}
                    </span>
                    <button
                        type="button"
                        className="refresh-table-button"
                        onClick={reload}
                        disabled={loading}
                    >
                        <RefreshCw size={14} />
                        Refresh list
                    </button>
                </div>
            </div>

            {modal?.type === "create" && (
                <RegionFormModal
                    directors={regionalDirectors}
                    onClose={() => setModal(null)}
                    onSaved={handleSaved}
                />
            )}

            {modal?.type === "edit" && (
                <RegionFormModal
                    region={modal.region}
                    director={getRegionDirector(modal.region._id)}
                    directors={regionalDirectors}
                    onClose={() => setModal(null)}
                    onSaved={handleSaved}
                />
            )}

            {modal?.type === "delete" && (
                <DeleteRegionModal
                    region={modal.region}
                    onClose={() => setModal(null)}
                    onDeleted={handleSaved}
                />
            )}
        </section>
    );
}

export default Regions;
