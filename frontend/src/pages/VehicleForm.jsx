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
    { value: "available", label: "Available" },
    { value: "on_mission", label: "On Mission" },
    { value: "at_parking", label: "Parked" },
    { value: "under_maintenance", label: "Under Maintenance" },
    { value: "out_of_service", label: "Out of Service" }
];

function splitRegistration(value = "") {
    const match = value.match(/^(\d+)\s*TUN\s*(\d+)$/i);

    if (match) {
        return { series: match[1], number: match[2] };
    }

    return { series: "", number: value };
}

function VehicleForm({ vehicleId, onClose, onSaved }) {
    const navigate = useNavigate();
    const { id: routeId } = useParams();
    const id = vehicleId ?? routeId;
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
                        error: "Unable to load regions."
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
                        "Unable to load vehicle information."
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
            setError("Vehicle registration number is required.");
            return;
        }

        if (form.series.trim() && !/^\d{1,3}$/.test(form.series.trim())) {
            setError("The series must contain between 1 and 3 digits.");
            return;
        }

        if (!form.brand.trim() || !form.model.trim() || !form.type.trim()) {
            setError("Please enter the vehicle make, model, and type.");
            return;
        }

        if (!form.region) {
            setError("Please select a region.");
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
            setError("Numeric values must be zero or greater.");
            return;
        }

        if (
            form.fuelType !== "Electric" &&
            capacity <= 0
        ) {
            setError("A Diesel or Petrol vehicle must have a positive fuel tank capacity.");
            return;
        }

        if (fuelLevel > capacity) {
            setError("Fuel level cannot exceed tank capacity.");
            return;
        }

        if (form.fuelType === "Electric" && (capacity !== 0 || fuelLevel !== 0)) {
            setError("An electric vehicle must have zero fuel tank capacity and fuel level.");
            return;
        }

        if (
            year !== undefined &&
            (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear())
        ) {
            setError("The vehicle year is invalid.");
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
                        note: "Status updated from the vehicle form"
                    });
                }
            }

            setSuccess("Vehicle saved successfully.");

            if (onSaved) onSaved();
            else navigate("/vehicles");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "An error occurred while saving the vehicle."
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
            if (onSaved) onSaved();
            else navigate("/vehicles");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to delete this vehicle."
            );
            setDeleteModal(false);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="vehicle-form-loading-modal">
                <div className="form-loading">
                <LoaderCircle size={25} />
                    Loading vehicle...
                </div>
            </div>
        );
    }

    return (
        <section className="page-view vehicle-form-page-modal">
            <button
                type="button"
                className="vehicle-form-modal-close icon-button"
                onClick={() => (onClose ? onClose() : navigate("/vehicles"))}
                aria-label="Close form"
            >
                <X size={20} />
            </button>

            <div className="page-breadcrumb">
                <span>Fleet & Operations</span>
                <ChevronRight size={14} />
                <span onClick={() => (onClose ? onClose() : navigate("/vehicles"))}>Vehicles</span>
                <ChevronRight size={14} />
                <span className="breadcrumb-current">
                    {editing ? "Edit Vehicle" : "New Vehicle"}
                </span>
            </div>

            <div className="page-heading">
                <div>
                    <div className="page-eyebrow">
                        <span className="eyebrow-dot" />
                        REGIONAL NODE TN-01
                        <span className="eyebrow-separator">/</span>
                        FLEET MANAGEMENT
                    </div>

                    <h1>{editing ? "Edit Vehicle" : "Add Vehicle"}</h1>

                    <p>
                        {editing
                            ? "Update the vehicle's technical details and mileage records."
                            : "Enter the vehicle's registration and fleet assignment details."}
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
                                Registration Plate Preview
                            </div>
                            <p>Standard registration format (TN Series / Number)</p>
                        </div>

                        <div className="registration-plate">
                            <span>{form.series || "000"}</span>
                            <span className="plate-country">TN / تونس</span>
                            <span>{form.number || "0000"}</span>
                        </div>
                    </div>

                    <div className="vehicle-form-section">
                        <h2><span />1. General Information</h2>

                        <div className="vehicle-form-grid">
                            <div className="form-field">
                                <label htmlFor="series">SERIES (TN) *</label>
                                <input
                                    id="series"
                                    name="series"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="3"
                                    placeholder="e.g. 214"
                                    value={form.series}
                                    onChange={updateField}
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="number">SERIAL NUMBER *</label>
                                <input
                                    id="number"
                                    name="number"
                                    type="text"
                                    placeholder="e.g. 8942"
                                    value={form.number}
                                    onChange={updateField}
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="brand">MAKE / MANUFACTURER *</label>
                                <input
                                    id="brand"
                                    name="brand"
                                    placeholder="e.g. Renault"
                                    value={form.brand}
                                    onChange={updateField}
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="model">MODEL *</label>
                                <input
                                    id="model"
                                    name="model"
                                    placeholder="e.g. Master III"
                                    value={form.model}
                                    onChange={updateField}
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="year">YEAR OF REGISTRATION</label>
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
                                <label htmlFor="type">BODY TYPE *</label>
                                <input
                                    id="type"
                                    name="type"
                                    placeholder="e.g. Van / Pick-up"
                                    value={form.type}
                                    onChange={updateField}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="vehicle-form-section">
                        <h2><span />2. Operations & Tracking</h2>

                        <div className="vehicle-form-grid">
                            <div className="form-field">
                                <label htmlFor="region">ASSIGNED REGION *</label>
                                <select
                                    id="region"
                                    name="region"
                                    value={form.region}
                                    onChange={updateField}
                                    required
                                >
                                    <option value="">Select a region</option>
                                    {regions.map(region => (
                                        <option key={region._id} value={region._id}>
                                            {region.name} — {region.location}
                                        </option>
                                    ))}
                                </select>
                                {regions.length === 0 && (
                                    <small>No regions available. Check the Region Management module.</small>
                                )}
                            </div>

                            <div className="form-field">
                                <label htmlFor="mileage">CURRENT ODOMETER *</label>
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
                                <label htmlFor="fuelType">FUEL TYPE *</label>
                                <select
                                    id="fuelType"
                                    name="fuelType"
                                    value={form.fuelType}
                                    onChange={updateField}
                                >
                                    <option value="Diesel">Diesel</option>
                                    <option value="Petrol">Petrol</option>
                                    <option value="Electric">Electric</option>
                                </select>
                            </div>

                            <div className="form-field">
                                <label htmlFor="fuelTankCapacity">FUEL TANK CAPACITY (L) *</label>
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
                                <label htmlFor="currentFuelLevel">CURRENT FUEL LEVEL (L) *</label>
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
                                <label htmlFor="status">OPERATIONAL STATUS</label>
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
                            Delete Vehicle
                        </button>
                    ) : <span />}

                    <div className="vehicle-form-footer-actions">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => (onClose ? onClose() : navigate("/vehicles"))}
                        >
                            <X size={16} />
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="button-primary"
                            disabled={saving}
                        >
                            {saving
                                ? <LoaderCircle size={16} className="loading-spinner" />
                                : <BadgeCheck size={17} />}
                            {editing ? "Save Changes" : "Save Vehicle"}
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
                        <h2>Delete this vehicle?</h2>
                        <p>
                            You are about to delete
                            <strong> {registrationNumber}</strong>.
                            This action is permanent. The backend may reject
                            deletion if related records exist.
                        </p>

                        <div className="vehicle-modal-footer">
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => setDeleteModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="button-danger"
                                onClick={handleDelete}
                                disabled={saving}
                            >
                                <Trash2 size={15} />
                                Confirm Deletion
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default VehicleForm;
