import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    BadgeCheck,
    CarFront,
    ChevronRight,
    LoaderCircle,
    Save,
    X,
    Trash2
} from "lucide-react";
import api from "../services/api";

const emptyForm = {
    series: "",
    number: "",
    brand: "",
    model: "",
    year: "",
    type: "",
    region: "",
    mileage: "",
    fuelType: "Diesel",
    fuelTankCapacity: "80",
    currentFuelLevel: "0",
    status: "at_parking"
};

const statuses = [
    { value: "available", label: "Disponible" },
    { value: "on_mission", label: "En mission" },
    { value: "at_parking", label: "Au parking" },
    { value: "under_maintenance", label: "En maintenance" },
    { value: "out_of_service", label: "Hors service" }
];

function splitRegistration(value = "") {
    const match = value.match(/^(\d+)\s*TUN\s*(\d+)$/i);

    if (match) {
        return { series: match[1], number: match[2] };
    }

    return { series: "", number: value };
}

function VehicleForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const editing = Boolean(id);

    const [form, setForm] = useState(emptyForm);
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(editing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [deleteModal, setDeleteModal] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadData() {
            try {
                const regionsPromise = api.get("/regions")
                    .then(response => ({
                        regions: Array.isArray(response.data) ? response.data : [],
                        error: ""
                    }))
                    .catch(() => ({
                        regions: [],
                        error: "Impossible de charger les régions."
                    }));

                const vehiclePromise = editing
                    ? api.get(`/vehicles/${id}`)
                    : Promise.resolve({ data: null });

                const [regionResult, vehicleResponse] = await Promise.all([
                    regionsPromise,
                    vehiclePromise
                ]);

                if (!active) return;

                setRegions(regionResult.regions);

                if (regionResult.error) {
                    setError(regionResult.error);
                }

                const vehicle = vehicleResponse.data;

                if (vehicle) {
                    const registration = splitRegistration(
                        vehicle.registrationNumber
                    );

                    setForm({
                        series: registration.series,
                        number: registration.number,
                        brand: vehicle.brand || "",
                        model: vehicle.model || "",
                        year: vehicle.year?.toString() || "",
                        type: vehicle.type || "",
                        region: typeof vehicle.region === "object"
                            ? vehicle.region?._id || ""
                            : vehicle.region || "",
                        mileage: vehicle.mileage?.toString() || "0",
                        fuelType: vehicle.fuelType || "Diesel",
                        fuelTankCapacity: vehicle.fuelTankCapacity?.toString() || "0",
                        currentFuelLevel: vehicle.currentFuelLevel?.toString() || "0",
                        status: vehicle.status || "at_parking"
                    });
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        "Impossible de charger les informations du véhicule."
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
    }, [id, editing]);

    function updateField(event) {
        const { name, value } = event.target;

        setForm(previous => {
            const updated = { ...previous, [name]: value };

            if (name === "fuelType" && value === "Electric") {
                updated.fuelTankCapacity = "0";
                updated.currentFuelLevel = "0";
            }

            return updated;
        });
    }

    const registrationNumber = form.series.trim()
        ? `${form.series.trim()} TUN ${form.number.trim()}`
        : form.number.trim();

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.series.trim() && !form.number.trim()) {
            setError("Le numéro d'immatriculation est obligatoire.");
            return;
        }

        if (form.series.trim() && !/^\d{1,3}$/.test(form.series.trim())) {
            setError("La série doit contenir entre 1 et 3 chiffres.");
            return;
        }

        if (!form.brand.trim() || !form.model.trim() || !form.type.trim()) {
            setError("Veuillez renseigner la marque, le modèle et le type.");
            return;
        }

        if (!form.region) {
            setError("Veuillez sélectionner une région.");
            return;
        }

        const mileage = Number(form.mileage);
        const capacity = Number(form.fuelTankCapacity);
        const fuelLevel = Number(form.currentFuelLevel);
        const year = form.year === "" ? undefined : Number(form.year);

        if (
            !Number.isFinite(mileage) || mileage < 0 ||
            !Number.isFinite(capacity) || capacity < 0 ||
            !Number.isFinite(fuelLevel) || fuelLevel < 0
        ) {
            setError("Les valeurs numériques doivent être positives ou nulles.");
            return;
        }

        if (
            form.fuelType !== "Electric" &&
            capacity <= 0
        ) {
            setError("Un véhicule Diesel ou Petrol doit avoir une capacité de réservoir positive.");
            return;
        }

        if (fuelLevel > capacity) {
            setError("Le niveau de carburant ne peut pas dépasser la capacité du réservoir.");
            return;
        }

        if (form.fuelType === "Electric" && (capacity !== 0 || fuelLevel !== 0)) {
            setError("Un véhicule électrique doit avoir une capacité et un niveau de carburant à zéro.");
            return;
        }

        if (
            year !== undefined &&
            (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear())
        ) {
            setError("L'année de mise en circulation est invalide.");
            return;
        }

        const payload = {
            registrationNumber: registrationNumber.toUpperCase(),
            brand: form.brand.trim(),
            model: form.model.trim(),
            type: form.type.trim(),
            year,
            fuelType: form.fuelType,
            fuelTankCapacity: capacity,
            mileage,
            currentFuelLevel: fuelLevel,
            region: form.region
        };

        setSaving(true);

        try {
            if (!editing) {
                await api.post("/vehicles", {
                    ...payload,
                    status: form.status
                });
            } else {
                await api.put(`/vehicles/${id}`, payload);

                const originalVehicle = await api.get(`/vehicles/${id}`);
                const originalStatus = originalVehicle.data.status;

                if (form.status !== originalStatus) {
                    await api.patch(`/vehicles/${id}/status`, {
                        status: form.status,
                        note: "Statut modifié depuis le formulaire véhicule"
                    });
                }
            }

            setSuccess("Véhicule enregistré avec succès.");

            navigate("/vehicles");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Une erreur est survenue pendant l'enregistrement."
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        setError("");
        setSaving(true);

        try {
            await api.delete(`/vehicles/${id}`);
            navigate("/vehicles");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Impossible de supprimer ce véhicule."
            );
            setDeleteModal(false);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="form-loading">
                <LoaderCircle size={25} />
                Chargement du véhicule...
            </div>
        );
    }

    return (
        <section className="page-view">
            <div className="page-breadcrumb">
                <span>Fleet & Parc</span>
                <ChevronRight size={14} />
                <span onClick={() => navigate("/vehicles")}>Véhicules</span>
                <ChevronRight size={14} />
                <span className="breadcrumb-current">
                    {editing ? "Modifier le véhicule" : "Nouveau véhicule"}
                </span>
            </div>

            <div className="page-heading">
                <div>
                    <div className="page-eyebrow">
                        <span className="eyebrow-dot" />
                        NŒUD RÉGIONAL TN-01
                        <span className="eyebrow-separator">/</span>
                        GESTION DU PARC ROULANT
                    </div>

                    <h1>{editing ? "Modifier le véhicule" : "Ajouter un véhicule"}</h1>

                    <p>
                        {editing
                            ? "Modifier les informations techniques et le suivi kilométrique du véhicule."
                            : "Saisir les informations d'enregistrement et d'affectation du véhicule au parc."}
                    </p>
                </div>
            </div>

            {error && (
                <div className="form-alert form-alert-error">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError("")}>×</button>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="vehicle-form-card">
                    <div className="plate-preview">
                        <div>
                            <div className="plate-title">
                                <CarFront size={19} />
                                Aperçu Plaque d'Immatriculation
                            </div>
                            <p>Format réglementaire standard (Série TN Numéro)</p>
                        </div>

                        <div className="registration-plate">
                            <span>{form.series || "000"}</span>
                            <span className="plate-country">TN / تونس</span>
                            <span>{form.number || "0000"}</span>
                        </div>
                    </div>

                    <div className="vehicle-form-section">
                        <h2><span />1. Informations Générales</h2>

                        <div className="vehicle-form-grid">
                            <div className="form-field">
                                <label htmlFor="series">SÉRIE (TN) *</label>
                                <input
                                    id="series"
                                    name="series"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="3"
                                    placeholder="Ex : 214"
                                    value={form.series}
                                    onChange={updateField}
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="number">NUMÉRO D'ORDRE *</label>
                                <input
                                    id="number"
                                    name="number"
                                    type="text"
                                    placeholder="Ex : 8942"
                                    value={form.number}
                                    onChange={updateField}
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="brand">MARQUE / CONSTRUCTEUR *</label>
                                <input
                                    id="brand"
                                    name="brand"
                                    placeholder="Ex : Renault"
                                    value={form.brand}
                                    onChange={updateField}
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="model">MODÈLE *</label>
                                <input
                                    id="model"
                                    name="model"
                                    placeholder="Ex : Master III"
                                    value={form.model}
                                    onChange={updateField}
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="year">ANNÉE DE MISE EN CIRCULATION</label>
                                <input
                                    id="year"
                                    name="year"
                                    type="number"
                                    min="1900"
                                    max={new Date().getFullYear()}
                                    placeholder="2022"
                                    value={form.year}
                                    onChange={updateField}
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="type">TYPE DE CARROSSERIE *</label>
                                <input
                                    id="type"
                                    name="type"
                                    placeholder="Ex : Utilitaire / Pick-up"
                                    value={form.type}
                                    onChange={updateField}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="vehicle-form-section">
                        <h2><span />2. Exploitation & Suivi</h2>

                        <div className="vehicle-form-grid">
                            <div className="form-field">
                                <label htmlFor="region">RÉGION DE RATTACHEMENT *</label>
                                <select
                                    id="region"
                                    name="region"
                                    value={form.region}
                                    onChange={updateField}
                                    required
                                >
                                    <option value="">Sélectionner une région</option>
                                    {regions.map(region => (
                                        <option key={region._id} value={region._id}>
                                            {region.name} — {region.governorate}
                                        </option>
                                    ))}
                                </select>
                                {regions.length === 0 && (
                                    <small>Aucune région disponible. Vérifiez le module Régions.</small>
                                )}
                            </div>

                            <div className="form-field">
                                <label htmlFor="mileage">COMPTEUR KILOMÉTRIQUE ACTUEL *</label>
                                <div className="input-with-suffix">
                                    <input
                                        id="mileage"
                                        name="mileage"
                                        type="number"
                                        min="0"
                                        value={form.mileage}
                                        onChange={updateField}
                                        required
                                    />
                                    <span>KM</span>
                                </div>
                            </div>

                            <div className="form-field">
                                <label htmlFor="fuelType">TYPE DE CARBURANT *</label>
                                <select
                                    id="fuelType"
                                    name="fuelType"
                                    value={form.fuelType}
                                    onChange={updateField}
                                >
                                    <option value="Diesel">Gasoil / Diesel</option>
                                    <option value="Petrol">Essence</option>
                                    <option value="Electric">Électrique</option>
                                </select>
                            </div>

                            <div className="form-field">
                                <label htmlFor="fuelTankCapacity">CAPACITÉ DU RÉSERVOIR (L) *</label>
                                <input
                                    id="fuelTankCapacity"
                                    name="fuelTankCapacity"
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={form.fuelTankCapacity}
                                    onChange={updateField}
                                    disabled={form.fuelType === "Electric"}
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="currentFuelLevel">NIVEAU ACTUEL DE CARBURANT (L) *</label>
                                <input
                                    id="currentFuelLevel"
                                    name="currentFuelLevel"
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={form.currentFuelLevel}
                                    onChange={updateField}
                                    disabled={form.fuelType === "Electric"}
                                    required
                                />
                            </div>

                            <div className="form-field form-field-full">
                                <label htmlFor="status">STATUT OPÉRATIONNEL</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={form.status}
                                    onChange={updateField}
                                >
                                    {statuses.map(status => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                                {editing && (
                                    <small>
                                        Le changement de statut est vérifié par le backend
                                        selon les missions et la maintenance en cours.
                                    </small>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="vehicle-form-footer">
                    {editing ? (
                        <button
                            type="button"
                            className="button-danger"
                            onClick={() => setDeleteModal(true)}
                        >
                            <Trash2 size={15} />
                            Supprimer le véhicule
                        </button>
                    ) : <span />}

                    <div className="vehicle-form-footer-actions">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => navigate("/vehicles")}
                        >
                            <X size={16} />
                            Annuler
                        </button>

                        <button
                            type="submit"
                            className="button-primary"
                            disabled={saving}
                        >
                            {saving
                                ? <LoaderCircle size={16} className="loading-spinner" />
                                : <BadgeCheck size={17} />}
                            {editing ? "Enregistrer les modifications" : "Enregistrer le véhicule"}
                        </button>
                    </div>
                </div>
            </form>

            {deleteModal && (
                <div
                    className="vehicle-modal-overlay"
                    onMouseDown={() => setDeleteModal(false)}
                >
                    <div
                        className="vehicle-modal delete-modal"
                        onMouseDown={event => event.stopPropagation()}
                    >
                        <div className="delete-modal-icon">
                            <Trash2 size={23} />
                        </div>
                        <h2>Supprimer ce véhicule ?</h2>
                        <p>
                            Vous êtes sur le point de supprimer
                            <strong> {registrationNumber}</strong>.
                            Cette action est définitive. Le backend peut refuser
                            la suppression si des enregistrements sont liés.
                        </p>

                        <div className="vehicle-modal-footer">
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => setDeleteModal(false)}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                className="button-danger"
                                onClick={handleDelete}
                                disabled={saving}
                            >
                                <Trash2 size={15} />
                                Confirmer la suppression
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default VehicleForm;
