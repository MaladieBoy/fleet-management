import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ContactRound,
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X
} from "lucide-react";
import api from "../services/api";
import { DeleteDriverModal, StatusConfirmModal } from "./DriverModals";
import { formatDate, getFullName, getInitials } from "./driverUtils";
import "./Drivers.css";

const COLUMN_COUNT = 7;

function Drivers() {
    const navigate = useNavigate();
    const location = useLocation();

    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState(location.state?.notice || "");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [modal, setModal] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const response = await api.get("/users");

                if (!active) return;

                setDrivers(Array.isArray(response.data) ? response.data : []);
                setError("");
            } catch (err) {
                if (!active) return;

                setError(
                    err.response?.data?.message ||
                    "Impossible de charger les chauffeurs. Vérifiez la connexion au serveur."
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
        setNotice(message);
        reload(false);
    }

    const filteredDrivers = useMemo(() => {
        const query = search.trim().toLowerCase();

        return drivers.filter((driver) => {
            const matchesSearch = !query || [
                driver.firstName,
                driver.lastName,
                getFullName(driver),
                driver.email,
                driver.cin
            ].some((value) =>
                String(value || "").toLowerCase().includes(query)
            );

            const matchesStatus =
                !statusFilter ||
                (statusFilter === "active" && driver.isActive) ||
                (statusFilter === "inactive" && !driver.isActive);

            return matchesSearch && matchesStatus;
        });
    }, [drivers, search, statusFilter]);

    const hasFilters = Boolean(search.trim() || statusFilter);

    function resetFilters() {
        setSearch("");
        setStatusFilter("");
    }

    function renderTableBody() {
        if (loading) {
            return (
                <tr>
                    <td colSpan={COLUMN_COUNT} className="table-message">
                        <LoaderCircle size={17} className="loading-spinner" />
                        Chargement des chauffeurs...
                    </td>
                </tr>
            );
        }

        if (error) {
            return (
                <tr>
                    <td colSpan={COLUMN_COUNT} className="table-message">
                        {error}
                        <div className="driver-message-actions">
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => reload()}
                            >
                                <RefreshCw size={14} />
                                Réessayer
                            </button>
                        </div>
                    </td>
                </tr>
            );
        }

        if (drivers.length === 0) {
            return (
                <tr>
                    <td colSpan={COLUMN_COUNT} className="table-message">
                        Aucun chauffeur enregistré dans votre région.
                        <div className="driver-message-actions">
                            <button
                                type="button"
                                className="button-primary"
                                onClick={() => navigate("/drivers/new")}
                            >
                                <Plus size={15} />
                                Ajouter un chauffeur
                            </button>
                        </div>
                    </td>
                </tr>
            );
        }

        if (filteredDrivers.length === 0) {
            return (
                <tr>
                    <td colSpan={COLUMN_COUNT} className="table-message">
                        Aucun chauffeur ne correspond à votre recherche.
                        <div className="driver-message-actions">
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={resetFilters}
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>
                    </td>
                </tr>
            );
        }

        return filteredDrivers.map((driver) => (
            <tr
                key={driver._id}
                className={driver.isActive ? "" : "driver-row-inactive"}
            >
                <td>
                    <div className="driver-identity">
                        <span className="driver-avatar">
                            {getInitials(driver)}
                        </span>
                        <div>
                            <strong>{getFullName(driver)}</strong>
                            {driver.cin && (
                                <span className="driver-sub">
                                    CIN {driver.cin}
                                </span>
                            )}
                        </div>
                    </div>
                </td>

                <td>{driver.email}</td>

                <td>
                    {driver.phoneNumber || (
                        <span className="driver-muted">—</span>
                    )}
                </td>

                <td>
                    {driver.licenseCategory ? (
                        <span className="license-badge">
                            Cat. {driver.licenseCategory}
                        </span>
                    ) : (
                        <span className="driver-muted">—</span>
                    )}
                </td>

                <td>
                    <span
                        className={
                            "status-badge " +
                            (driver.isActive ? "status-mission" : "status-out")
                        }
                    >
                        <span />
                        {driver.isActive ? "Actif" : "Inactif"}
                    </span>
                </td>

                <td>{formatDate(driver.createdAt)}</td>

                <td>
                    <div className="table-actions">
                        <button
                            type="button"
                            className="icon-button"
                            title="Modifier"
                            aria-label={"Modifier " + getFullName(driver)}
                            onClick={() =>
                                navigate("/drivers/" + driver._id + "/edit")
                            }
                        >
                            <Pencil size={14} />
                        </button>

                        <button
                            type="button"
                            className={
                                "driver-status-button " +
                                (driver.isActive
                                    ? "button-danger"
                                    : "button-secondary")
                            }
                            onClick={() => setModal({ type: "status", driver })}
                        >
                            {driver.isActive ? "Désactiver" : "Activer"}
                        </button>

                        <button
                            type="button"
                            className="icon-button danger"
                            title="Supprimer"
                            aria-label={"Supprimer " + getFullName(driver)}
                            onClick={() => setModal({ type: "delete", driver })}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </td>
            </tr>
        ));
    }

    return (
        <section className="page-view">
            <div className="page-breadcrumb">
                <ContactRound size={15} />
                <span>Flotte &amp; Personnel</span>
                <span>/</span>
                <span className="breadcrumb-current">Chauffeurs</span>
            </div>

            <div className="page-heading driver-heading">
                <div>
                    <div className="page-eyebrow">
                        <span className="eyebrow-dot" />
                        ÉQUIPE RÉGIONALE
                    </div>
                    <h1>Driver Management</h1>
                    <p>Gestion des chauffeurs de votre région.</p>
                </div>

                <div className="page-actions">
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => reload()}
                        disabled={loading}
                    >
                        <RefreshCw size={15} />
                        Actualiser
                    </button>

                    <button
                        type="button"
                        className="button-primary"
                        onClick={() => navigate("/drivers/new")}
                    >
                        <Plus size={15} />
                        Ajouter un chauffeur
                    </button>
                </div>
            </div>

            {notice && (
                <div className="driver-notice" role="status">
                    <span>{notice}</span>
                    <button
                        type="button"
                        onClick={() => setNotice("")}
                        aria-label="Fermer le message"
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="driver-toolbar">
                <div className="driver-search">
                    <Search size={16} />
                    <input
                        type="search"
                        placeholder="Rechercher par nom, email ou CIN..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        aria-label="Rechercher un chauffeur"
                    />
                </div>

                <select
                    className="driver-select"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="Filtrer par statut"
                >
                    <option value="">Tous les statuts</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                </select>

                {hasFilters && (
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={resetFilters}
                    >
                        <X size={14} />
                        Réinitialiser
                    </button>
                )}
            </div>

            <div className="vehicle-table-panel">
                <div className="vehicle-table-heading">
                    <div>
                        <h2>Liste des chauffeurs</h2>
                        <span className="vehicle-result-count">
                            {filteredDrivers.length} / {drivers.length}
                        </span>
                    </div>
                </div>

                <div className="table-scroll">
                    <table className="maintenance-table">
                        <thead>
                            <tr>
                                <th>Chauffeur</th>
                                <th>Email</th>
                                <th>Téléphone</th>
                                <th>Permis</th>
                                <th>Statut</th>
                                <th>Créé le</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>{renderTableBody()}</tbody>
                    </table>
                </div>
            </div>

            {modal?.type === "status" && (
                <StatusConfirmModal
                    driver={modal.driver}
                    onClose={() => setModal(null)}
                    onConfirmed={handleDone}
                />
            )}

            {modal?.type === "delete" && (
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
