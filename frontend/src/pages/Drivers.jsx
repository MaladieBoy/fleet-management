import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    ContactRound,
    Eye,
    LoaderCircle,
    Users,
    UserCheck,
    UserX,
    FileWarning,
    ChevronLeft,
    ChevronRight,
    SlidersHorizontal,
    Power,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { DeleteDriverModal, StatusConfirmModal } from "./DriverModals";
import DriverForm from "./DriverForm";
import { getFullName, getInitials } from "./driverUtils";
import "./Drivers.css";

function DriverDetails({ driver, onClose }) {
    function displayDate(value) {
        if (!value) return "Not provided";
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "Not provided"
            : date.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
    }

    const regionName = typeof driver.region === "object"
        ? driver.region?.name || driver.region?.location || "Not provided"
        : driver.region || "Not provided";

    return (
        <div className="vehicle-modal-overlay" onMouseDown={onClose}>
            <div
                className="vehicle-modal vehicle-details-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="driver-details-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="vehicle-modal-header">
                    <div>
                        <span className="modal-eyebrow">DRIVER PROFILE</span>
                        <h2 id="driver-details-title">{getFullName(driver)}</h2>
                        <span className="modal-subtitle">{driver.email}</span>
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
                        <span className="driver-avatar large">
                            {getInitials(driver)}
                        </span>
                        <div>
                            <strong>{getFullName(driver)}</strong>
                            <span>{driver.phoneNumber || "No phone number"}</span>
                        </div>
                        <span className={
                            "status-badge " +
                            (driver.isActive ? "status-mission" : "status-out")
                        }>
                            <span />
                            {driver.isActive ? "Active" : "Inactive"}
                        </span>
                    </div>

                    <div className="vehicle-detail-section">
                        <h3>Personal information</h3>
                        <div className="vehicle-detail-grid">
                            <div><span>FIRST NAME</span><strong>{driver.firstName || "—"}</strong></div>
                            <div><span>LAST NAME</span><strong>{driver.lastName || "—"}</strong></div>
                            <div><span>NATIONAL ID (CIN)</span><strong className="detail-mono">{driver.cin || "—"}</strong></div>
                            <div><span>DATE OF BIRTH</span><strong>{displayDate(driver.birthDate)}</strong></div>
                            <div><span>EMAIL</span><strong>{driver.email || "—"}</strong></div>
                            <div><span>PHONE</span><strong>{driver.phoneNumber || "—"}</strong></div>
                            <div><span>ADDRESS</span><strong>{driver.address || "—"}</strong></div>
                        </div>
                    </div>

                    <div className="vehicle-detail-section">
                        <h3>Driving licence and assignment</h3>
                        <div className="vehicle-detail-grid">
                            <div><span>LICENCE CATEGORY</span><strong>{driver.licenseCategory || "—"}</strong></div>
                            <div><span>LICENCE NUMBER</span><strong className="detail-mono">{driver.licenseNumber || "—"}</strong></div>
                            <div><span>LICENCE EXPIRY</span><strong>{displayDate(driver.licenseExpiry)}</strong></div>
                            <div><span>REGION</span><strong>{regionName}</strong></div>
                            <div><span>DEPOT / HUB</span><strong>{driver.hub || "—"}</strong></div>
                        </div>
                    </div>

                    <div className="vehicle-detail-section">
                        <h3>Account information</h3>
                        <div className="vehicle-detail-grid">
                            <div><span>ACCOUNT STATUS</span><strong>{driver.isActive ? "Active" : "Inactive"}</strong></div>
                            <div><span>CREATED ON</span><strong>{displayDate(driver.createdAt)}</strong></div>
                        </div>
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
                </div>
            </div>
        </div>
    );
}

function Drivers() {
    const location = useLocation();
    const { user } = useAuth();
    const isGeneralDirector = user?.role === "general_director";
    const columnCount = isGeneralDirector ? 8 : 7;

    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState(location.state?.notice || "");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [licenseFilter, setLicenseFilter] = useState("");
    const [hubFilter, setHubFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;
    const [modal, setModal] = useState(null);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editingDriverId, setEditingDriverId] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const response = await api.get("/users");

                if (!active) return;

                setDrivers(
                    Array.isArray(response.data)
                        ? response.data.filter((account) => account.role === "driver")
                        : []
                );
                setError("");
            } catch (err) {
                if (!active) return;

                setError(
                    err.response?.data?.message ||
                    "Unable to load drivers. Check your server connection."
                );
            } finally {
                if (active) setLoading(false);
            }
        }

        load();

        return () => {
            active = false;
        };
    }, [reloadKey]);

    useEffect(() => {
        if (!notice) return undefined;

        const timer = setTimeout(() => setNotice(""), 5000);

        return () => clearTimeout(timer);
    }, [notice]);

    function reload(showSpinner = true) {
        if (showSpinner) setLoading(true);
        setReloadKey((key) => key + 1);
    }

    function handleDone(message) {
        setModal(null);
        setSelectedDriver(null);
        setFormOpen(false);
        setEditingDriverId(null);
        setNotice(message);
        reload(false);
    }

    function openCreateForm() {
        setEditingDriverId(null);
        setFormOpen(true);
    }

    function handleEdit(driver) {
        setSelectedDriver(null);
        setEditingDriverId(driver._id);
        setFormOpen(true);
    }

    function closeForm() {
        setFormOpen(false);
        setEditingDriverId(null);
    }

    const filteredDrivers = useMemo(() => {
        const query = search.trim().toLowerCase();

        return drivers.filter((driver) => {
            const matchesSearch = !query || [
                driver.firstName, driver.lastName, getFullName(driver),
                driver.email, driver.cin, driver.licenseNumber, driver.hub
            ].some(value => String(value || "").toLowerCase().includes(query));

            const matchesStatus = !statusFilter ||
                (statusFilter === "active" && driver.isActive) ||
                (statusFilter === "inactive" && !driver.isActive);

            return matchesSearch &&
                matchesStatus &&
                (!licenseFilter || driver.licenseCategory === licenseFilter) &&
                (!hubFilter || driver.hub === hubFilter);
        });
    }, [drivers, search, statusFilter, licenseFilter, hubFilter]);

    const hubs = useMemo(
        () => [...new Set(drivers.map(driver => driver.hub).filter(Boolean))].sort(),
        [drivers]
    );

    const activeCount = drivers.filter(driver => driver.isActive).length;
    const inactiveCount = drivers.length - activeCount;

    const expiredLicenseCount = drivers.filter(driver => {
        if (!driver.licenseExpiry) return false;
        const expiry = new Date(driver.licenseExpiry);
        return !Number.isNaN(expiry.getTime()) && expiry < new Date();
    }).length;

    const pageCount = Math.max(1, Math.ceil(filteredDrivers.length / pageSize));
    const safePage = Math.min(currentPage, pageCount);
    const paginatedDrivers = filteredDrivers.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize
    );
    const firstVisible = filteredDrivers.length ? (safePage - 1) * pageSize + 1 : 0;
    const lastVisible = Math.min(safePage * pageSize, filteredDrivers.length);
    const hasFilters = Boolean(search.trim() || statusFilter || licenseFilter || hubFilter);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, licenseFilter, hubFilter]);

    function resetFilters() {
        setSearch("");
        setStatusFilter("");
        setLicenseFilter("");
        setHubFilter("");
    }

    function formatLicenceExpiry(value) {
        if (!value) return "Expiry not provided";
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "Expiry not provided"
            : "Valid until " + date.toLocaleDateString("en-GB");
    }

    function renderTableBody() {
        if (loading) {
            return <tr><td colSpan={columnCount} className="table-message">
                <LoaderCircle size={17} className="loading-spinner" /> Loading drivers...
            </td></tr>;
        }

        if (error) {
            return <tr><td colSpan={columnCount} className="table-message">
                {error}
                <div className="driver-message-actions">
                    <button type="button" className="button-secondary" onClick={() => reload()}>
                        <RefreshCw size={14} /> Retry
                    </button>
                </div>
            </td></tr>;
        }

        if (!drivers.length) {
            return <tr><td colSpan={columnCount} className="table-message">
                {isGeneralDirector
                    ? "No drivers have been registered in the fleet yet."
                    : "No drivers registered in your region."}
                {!isGeneralDirector && (
                    <div className="driver-message-actions">
                        <button type="button" className="button-primary" onClick={openCreateForm}>
                            <Plus size={15} /> Add driver
                        </button>
                    </div>
                )}
            </td></tr>;
        }

        if (!filteredDrivers.length) {
            return <tr><td colSpan={columnCount} className="table-message">
                No drivers match your filters.
                <div className="driver-message-actions">
                    <button type="button" className="button-secondary" onClick={resetFilters}>
                        Reset filters
                    </button>
                </div>
            </td></tr>;
        }

        return paginatedDrivers.map(driver => (
            <tr key={driver._id} className={driver.isActive ? "" : "driver-row-inactive"}>
                <td>
                    <div className="driver-identity">
                        <span className="driver-avatar">{getInitials(driver)}</span>
                        <div>
                            <strong>{getFullName(driver)}</strong>
                            <span className="driver-sub">{driver.email || "No email provided"}</span>
                        </div>
                    </div>
                </td>
                {isGeneralDirector && (
                    <td>
                        {driver.region && typeof driver.region === "object"
                            ? `${driver.region.name || "Unknown region"}${
                                driver.region.location
                                    ? ` · ${driver.region.location}`
                                    : ""
                            }`
                            : "Not assigned"}
                    </td>
                )}
                <td className="driver-mono">{driver.cin || "—"}</td>
                <td>
                    {driver.licenseCategory ? (
                        <div className="driver-license-cell">
                            <span className="license-badge">{driver.licenseCategory}</span>
                            <span className="driver-sub">{formatLicenceExpiry(driver.licenseExpiry)}</span>
                        </div>
                    ) : <span className="driver-muted">Not provided</span>}
                </td>
                <td>{driver.hub || "—"}</td>
                <td className="driver-mono">{driver.phoneNumber || "—"}</td>
                <td>
                    <span className={"status-badge " + (driver.isActive ? "status-mission" : "status-out")}>
                        <span />{driver.isActive ? "Active" : "Inactive"}
                    </span>
                </td>
                <td>
                    <div className="vehicle-actions driver-row-actions">
                        <button type="button" className="table-action" title="View details"
                            aria-label={"View " + getFullName(driver)}
                            onClick={() => setSelectedDriver(driver)}>
                            <Eye size={15} />
                        </button>
                        {!isGeneralDirector && (
                            <>
                                <button type="button" className="table-action" title="Edit driver"
                                    aria-label={"Edit " + getFullName(driver)}
                                    onClick={() => handleEdit(driver)}>
                                    <Pencil size={14} />
                                </button>
                                <button type="button" className="table-action driver-toggle-action"
                                    title={driver.isActive ? "Deactivate driver" : "Activate driver"}
                                    aria-label={driver.isActive ? "Deactivate driver" : "Activate driver"}
                                    onClick={() => setModal({ type: "status", driver })}>
                                    <Power size={15} />
                                </button>
                                <button type="button" className="table-action driver-delete-action"
                                    title="Delete driver" aria-label={"Delete " + getFullName(driver)}
                                    onClick={() => setModal({ type: "delete", driver })}>
                                    <Trash2 size={14} />
                                </button>
                            </>
                        )}
                    </div>
                </td>
            </tr>
        ));
    }

    return (
        <section className="page-view drivers-page">
            <div className="page-breadcrumb">
                <ContactRound size={15} />
                <span>Fleet &amp; Personnel</span><span>/</span>
                <span className="breadcrumb-current">Drivers</span>
            </div>

            <div className="page-heading driver-heading">
                <div>
                    <div className="page-eyebrow"><span className="eyebrow-dot" />REGIONAL FLEET / DRIVER MANAGEMENT</div>
                    <h1>{isGeneralDirector ? "Driver Directory" : "Driver Management"}</h1>
                    <p>
                        {isGeneralDirector
                            ? "View drivers across all operational regions."
                            : "Manage regional drivers, licence information, and account status."}
                    </p>
                </div>
                <div className="page-actions">
                    <button type="button" className="button-secondary" onClick={() => reload()} disabled={loading}>
                        <RefreshCw size={15} /> Refresh
                    </button>
                    {!isGeneralDirector && (
                        <button type="button" className="button-primary" onClick={openCreateForm}>
                            <Plus size={15} /> Add Driver
                        </button>
                    )}
                </div>
            </div>

            {notice && <div className="driver-notice" role="status">
                <span>{notice}</span>
                <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification">×</button>
            </div>}

            <div className="driver-kpi-grid">
                <div className="driver-kpi-card">
                    <div className="driver-kpi-top"><span>TOTAL DRIVERS</span><span className="driver-kpi-icon blue"><Users size={18} /></span></div>
                    <strong>{loading ? "—" : drivers.length}</strong>
                    <small>{isGeneralDirector ? "Registered across all regions" : "Registered in your region"}</small>
                </div>
                <div className="driver-kpi-card">
                    <div className="driver-kpi-top"><span>ACTIVE ACCOUNTS</span><span className="driver-kpi-icon green"><UserCheck size={18} /></span></div>
                    <strong className="driver-kpi-green">{loading ? "—" : activeCount}</strong><small>Drivers with active access</small>
                </div>
                <div className="driver-kpi-card">
                    <div className="driver-kpi-top"><span>INACTIVE ACCOUNTS</span><span className="driver-kpi-icon cyan"><UserX size={18} /></span></div>
                    <strong>{loading ? "—" : inactiveCount}</strong><small>Access currently disabled</small>
                </div>
                <div className="driver-kpi-card">
                    <div className="driver-kpi-top"><span>EXPIRED LICENCES</span><span className="driver-kpi-icon amber"><FileWarning size={18} /></span></div>
                    <strong className="driver-kpi-amber">{loading ? "—" : expiredLicenseCount}</strong><small>Require renewal review</small>
                </div>
            </div>

            <div className="driver-toolbar">
                <div className="driver-search">
                    <Search size={16} />
                    <input type="search" placeholder="Search name, email, CIN, or licence number..."
                        value={search} onChange={event => setSearch(event.target.value)} aria-label="Search drivers" />
                </div>
                <label className="driver-filter">
                    <SlidersHorizontal size={15} />
                    <select value={licenseFilter} onChange={event => setLicenseFilter(event.target.value)} aria-label="Filter by licence">
                        <option value="">All licence categories</option>
                        <option value="B">Category B</option><option value="C">Category C</option>
                        <option value="C+E">Category C+E</option><option value="D">Category D</option>
                    </select>
                </label>
                <label className="driver-filter">
                    <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by status">
                        <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
                    </select>
                </label>
                <label className="driver-filter">
                    <select value={hubFilter} onChange={event => setHubFilter(event.target.value)} aria-label="Filter by depot">
                        <option value="">All depots</option>
                        {hubs.map(hub => <option key={hub} value={hub}>{hub}</option>)}
                    </select>
                </label>
                {hasFilters && <button type="button" className="filter-reset-button" onClick={resetFilters} title="Reset filters" aria-label="Reset filters"><X size={15} /></button>}
            </div>

            <div className="vehicle-table-panel driver-table-panel">
                <div className="vehicle-table-heading">
                    <div>
                        <h2>{isGeneralDirector ? "All Fleet Drivers" : "Regional Drivers"}</h2>
                        <span className="vehicle-result-count">{filteredDrivers.length} drivers</span>
                    </div>
                    <div className="table-live-status">
                        <span className="online-dot" />
                        {isGeneralDirector ? "Fleet-wide directory" : "Regional directory"}
                    </div>
                </div>
                <div className="vehicle-table-scroll">
                    <table className="vehicle-table driver-table">
                        <thead><tr>
                            <th>DRIVER</th>
                            {isGeneralDirector && <th>REGION</th>}
                            <th>CIN</th><th>LICENCE</th><th>DEPOT</th>
                            <th>PHONE</th><th>STATUS</th><th>ACTIONS</th>
                        </tr></thead>
                        <tbody>{renderTableBody()}</tbody>
                    </table>
                </div>
                <div className="driver-pagination">
                    <span>Showing {firstVisible}–{lastVisible} of {filteredDrivers.length} drivers</span>
                    <div className="driver-pagination-controls">
                        <button type="button" onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={safePage === 1}>
                            <ChevronLeft size={14} /> Previous
                        </button>
                        {Array.from({ length: pageCount }, (_, index) => index + 1).map(page => (
                            <button key={page} type="button" className={page === safePage ? "active" : ""} onClick={() => setCurrentPage(page)}>{page}</button>
                        ))}
                        <button type="button" onClick={() => setCurrentPage(page => Math.min(pageCount, page + 1))} disabled={safePage === pageCount}>
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {selectedDriver && (
                <DriverDetails
                    driver={selectedDriver}
                    onClose={() => setSelectedDriver(null)}
                />
            )}

            {!isGeneralDirector && formOpen && (
                <div className="vehicle-modal-overlay" onMouseDown={closeForm}>
                    <div
                        className="vehicle-modal vehicle-form-dialog"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <DriverForm
                            driverId={editingDriverId}
                            onClose={closeForm}
                            onSaved={handleDone}
                        />
                    </div>
                </div>
            )}

            {!isGeneralDirector && modal?.type === "status" && (
                <StatusConfirmModal
                    driver={modal.driver}
                    onClose={() => setModal(null)}
                    onConfirmed={handleDone}
                />
            )}

            {!isGeneralDirector && modal?.type === "delete" && (
                <DeleteDriverModal
                    driver={modal.driver}
                    onClose={() => setModal(null)}
                    onDone={handleDone}
                />
            )}
        </section>
    );
}

export default Drivers;
