import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    Check,
    ContactRound,
    Info,
    LoaderCircle,
    ShieldCheck,
    Trash2,
    UserRound,
    X
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { DeleteDriverModal } from "./DriverModals";
import {
    HUB_SUGGESTIONS,
    LICENSE_CATEGORIES,
    formatDate,
    getFullName,
    getInitials,
    getRegionName,
    toDateInput
} from "./driverUtils";
import "./Drivers.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s().-]{8,20}$/;

const emptyForm = {
    firstName: "",
    lastName: "",
    email: "",
    cin: "",
    birthDate: "",
    phoneNumber: "",
    address: "",
    licenseCategory: "",
    licenseNumber: "",
    licenseExpiry: "",
    hub: "",
    isActive: "true"
};

function validate(form) {
    const errors = {};

    if (!form.firstName.trim()) {
        errors.firstName = "First name is required.";
    }

    if (!form.lastName.trim()) {
        errors.lastName = "Last name is required.";
    }

    if (!form.email.trim()) {
        errors.email = "Email address is required.";
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
        errors.email = "Invalid email address.";
    }

    if (!/^\d{8}$/.test(form.cin.trim())) {
        errors.cin = "National ID must contain exactly 8 digits.";
    }

    if (!PHONE_PATTERN.test(form.phoneNumber.trim())) {
        errors.phoneNumber = "Invalid phone number.";
    }

    if (form.birthDate) {
        const birth = new Date(form.birthDate);
        const limit = new Date();
        limit.setFullYear(limit.getFullYear() - 18);

        if (Number.isNaN(birth.getTime()) || birth.getFullYear() < 1900) {
            errors.birthDate = "Invalid date of birth.";
        } else if (birth > limit) {
            errors.birthDate = "The driver must be at least 18 years old.";
        }
    }

    if (form.address.trim().length > 200) {
        errors.address = "Maximum 200 characters.";
    }

    if (!form.licenseCategory) {
        errors.licenseCategory = "Select a licence category.";
    }

    const licenseNumber = form.licenseNumber.trim();

    if (licenseNumber.length < 3 || licenseNumber.length > 30) {
        errors.licenseNumber = "Between 3 and 30 characters.";
    }

    if (
        !form.licenseExpiry ||
        Number.isNaN(new Date(form.licenseExpiry).getTime())
    ) {
        errors.licenseExpiry = "Licence expiry date is required.";
    }

    const hub = form.hub.trim();

    if (hub.length < 2 || hub.length > 80) {
        errors.hub = "Enter the depot name (2 to 80 characters).";
    }

    return errors;
}

function buildPayload(form) {
    return {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        cin: form.cin.trim(),
        birthDate: form.birthDate,
        address: form.address.trim(),
        licenseCategory: form.licenseCategory,
        licenseNumber: form.licenseNumber.trim(),
        licenseExpiry: form.licenseExpiry,
        hub: form.hub.trim()
    };
}

function Field({ id, label, required, hint, error, full, children }) {
    return (
        <div className={"form-field" + (full ? " full" : "")}>
            <label htmlFor={id}>
                {label}
                {required ? " *" : ""}
            </label>
            {children}
            {hint && !error && <small>{hint}</small>}
            {error && <small className="field-error">{error}</small>}
        </div>
    );
}

function DriverForm({ driverId, onClose, onSaved }) {
    const { id: routeId } = useParams();
    const id = driverId ?? routeId;
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { user } = useAuth();

    const [form, setForm] = useState(emptyForm);
    const [original, setOriginal] = useState(null);
    const [loading, setLoading] = useState(isEdit);
    const [loadError, setLoadError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!isEdit) return undefined;

        let active = true;

        async function load() {
            try {
                const response = await api.get("/users");

                if (!active) return;

                const list = Array.isArray(response.data) ? response.data : [];
                const driver = list.find((item) => item._id === id);

                if (!driver) {
                    setLoadError("Driver not found in your region.");
                    return;
                }

                setOriginal(driver);
                setForm({
                    firstName: driver.firstName || "",
                    lastName: driver.lastName || "",
                    email: driver.email || "",
                    cin: driver.cin || "",
                    birthDate: toDateInput(driver.birthDate),
                    phoneNumber: driver.phoneNumber || "",
                    address: driver.address || "",
                    licenseCategory: driver.licenseCategory || "",
                    licenseNumber: driver.licenseNumber || "",
                    licenseExpiry: toDateInput(driver.licenseExpiry),
                    hub: driver.hub || "",
                    isActive: driver.isActive ? "true" : "false"
                });
            } catch (err) {
                if (!active) return;

                setLoadError(
                    err.response?.data?.message ||
                    "Unable to load the driver. Check your server connection."
                );
            } finally {
                if (active) setLoading(false);
            }
        }

        load();

        return () => {
            active = false;
        };
    }, [id, isEdit]);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({ ...previous, [name]: value }));
        setFieldErrors((previous) => ({ ...previous, [name]: "" }));
    }

    function inputProps(name) {
        return {
            id: "driver-" + name,
            name,
            value: form[name],
            onChange: handleChange,
            disabled: saving,
            className: fieldErrors[name] ? "has-error" : "",
            "aria-invalid": Boolean(fieldErrors[name])
        };
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const errors = validate(form);
        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            setError("Please correct the highlighted fields.");
            return;
        }

        setError("");

        const payload = buildPayload(form);
        const wantsActive = form.isActive === "true";
        let profileSaved = false;

        try {
            setSaving(true);

            if (isEdit) {
                await api.put("/users/" + id, payload);
                profileSaved = true;

                if (original && original.isActive !== wantsActive) {
                    await api.patch("/users/" + id + "/status", {
                        isActive: wantsActive
                    });
                }
            } else {
                await api.post("/users", { ...payload, isActive: wantsActive });
            }

            const message = isEdit
                ? "Driver updated successfully."
                : "Driver created successfully.";

            if (onSaved) onSaved(message);
            else navigate("/drivers", { state: { notice: message } });
        } catch (err) {
            const message =
                err.response?.data?.message ||
                "Unable to save the driver. Check your server connection.";

            setError(
                profileSaved
                    ? "Profile saved, but the account status could not be updated: " +
                    message
                    : message
            );
            setSaving(false);
        }
    }

    const previewName = (form.firstName + " " + form.lastName).trim();
    const regionName = getRegionName(user?.region) || "Your region";
    const categoryLabel = LICENSE_CATEGORIES.find(
        (item) => item.value === form.licenseCategory
    );
    const formActive = form.isActive === "true";

    const breadcrumb = (
        <div className="page-breadcrumb">
            <ContactRound size={15} />
            <span>Fleet &amp; Personnel</span>
            <span>/</span>
            <Link to="/drivers" className="breadcrumb-link">
                Drivers
            </Link>
            <span>/</span>
            <span className="breadcrumb-current">
                {isEdit ? "Edit Driver" : "New Driver"}
            </span>
        </div>
    );

    if (loading) {
        return (
            <section className="page-view">
                {breadcrumb}
                <div className="page-loading">
                    <LoaderCircle size={20} className="loading-spinner" />
                    Loading driver...
                </div>
            </section>
        );
    }

    if (loadError) {
        return (
            <section className="page-view">
                {breadcrumb}
                <div className="error-banner">
                    <span>{loadError}</span>
                </div>
                <button
                    type="button"
                    className="button-secondary"
                    onClick={() => (onClose ? onClose() : navigate("/drivers"))}
                >
                    Back to Driver List
                </button>
            </section>
        );
    }

    return (
        <section className="page-view driver-form-page-modal">
            <button
                type="button"
                className="vehicle-form-modal-close icon-button"
                onClick={() => (onClose ? onClose() : navigate("/drivers"))}
                aria-label="Close form"
            >
                <X size={20} />
            </button>
            {breadcrumb}

            <div className="page-heading">
                <div>
                    <div className="page-eyebrow">
                        <span className="eyebrow-dot" />
                        {isEdit ? "DRIVER PROFILE" : "NEW DRIVER"}
                    </div>
                    <h1>{isEdit ? "Edit Driver" : "Add Driver"}</h1>
                    <p>
                        {isEdit
                            ? "Update the driver's personal information, licence details, and assigned depot."
                            : "Register a driver and assign them to the regional hub."}
                    </p>
                </div>
            </div>

            {isEdit && original && (
                <div className="driver-summary">
                    <div className="driver-avatar xl">{getInitials(original)}</div>

                    <div className="driver-summary-body">
                        <span className="driver-summary-eyebrow">
                            TUNISIAN DRIVING LICENCE
                        </span>
                        <h2>{getFullName(original)}</h2>
                        <p>
                            CIN: <span>{original.cin || "—"}</span> | Licence:{" "}
                            <span>{original.licenseCategory || "—"}</span> | Depot:{" "}
                            <span>{original.hub || "—"}</span> | Created on{" "}
                            <span>{formatDate(original.createdAt)}</span>
                        </p>
                    </div>

                    <span
                        className={
                            "status-badge " +
                            (original.isActive ? "status-mission" : "status-out")
                        }
                    >
                        <span />
                        {original.isActive ? "Active" : "Inactive"}
                    </span>
                </div>
            )}

            <div className={"driver-form-layout" + (isEdit ? " single" : "")}>
                <form
                    className="driver-form-main"
                    onSubmit={handleSubmit}
                    noValidate
                >
                    {error && (
                        <div className="form-alert form-alert-error">
                            <span>{error}</span>
                            <button
                                type="button"
                                onClick={() => setError("")}
                                aria-label="Close message"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    <div className="driver-card">
                        <h2 className="driver-card-title">
                            <UserRound size={18} />
                            1. Personal Information &amp; Identity
                        </h2>

                        <div className="driver-grid">
                            <Field
                                id="driver-firstName"
                                label="First Name"
                                required
                                error={fieldErrors.firstName}
                            >
                                <input {...inputProps("firstName")} placeholder="e.g. Mohamed" />
                            </Field>

                            <Field
                                id="driver-lastName"
                                label="Last Name"
                                required
                                error={fieldErrors.lastName}
                            >
                                <input {...inputProps("lastName")} placeholder="e.g. Ben Salem" />
                            </Field>

                            <Field
                                id="driver-email"
                                label="Email Address (Google Account)"
                                required
                                full
                                hint="The driver will sign in using this Google account."
                                error={fieldErrors.email}
                            >
                                <input
                                    {...inputProps("email")}
                                    type="email"
                                    placeholder="driver@example.com"
                                />
                            </Field>

                            <Field
                                id="driver-cin"
                                label="National ID Number"
                                required
                                hint="8-digit national identification number"
                                error={fieldErrors.cin}
                            >
                                <input
                                    {...inputProps("cin")}
                                    inputMode="numeric"
                                    maxLength={8}
                                    placeholder="e.g. 08492147"
                                />
                            </Field>

                            <Field
                                id="driver-birthDate"
                                label="Date de naissance"
                                error={fieldErrors.birthDate}
                            >
                                <input {...inputProps("birthDate")} type="date" />
                            </Field>

                            <Field
                                id="driver-phoneNumber"
                                label="Phone Number"
                                required
                                error={fieldErrors.phoneNumber}
                            >
                                <input
                                    {...inputProps("phoneNumber")}
                                    type="tel"
                                    placeholder="+216 98 421 890"
                                />
                            </Field>

                            <Field
                                id="driver-address"
                                label="Home Address"
                                error={fieldErrors.address}
                            >
                                <input
                                    {...inputProps("address")}
                                    placeholder="e.g. Nouvelle Medina, Ben Arous"
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="driver-card">
                        <h2 className="driver-card-title">
                            <ShieldCheck size={18} />
                            2. Licence &amp; Regional Assignment
                        </h2>

                        <div className="driver-grid">
                            <Field
                                id="driver-licenseCategory"
                                label="Licence Category"
                                required
                                error={fieldErrors.licenseCategory}
                            >
                                <select {...inputProps("licenseCategory")}>
                                    <option value="">Select...</option>
                                    {LICENSE_CATEGORIES.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                id="driver-licenseNumber"
                                label="Driving Licence Number"
                                required
                                error={fieldErrors.licenseNumber}
                            >
                                <input
                                    {...inputProps("licenseNumber")}
                                    placeholder="e.g. 12/489201"
                                />
                            </Field>

                            <Field
                                id="driver-licenseExpiry"
                                label="Licence Expiry Date"
                                required
                                error={fieldErrors.licenseExpiry}
                            >
                                <input {...inputProps("licenseExpiry")} type="date" />
                            </Field>

                            <Field
                                id="driver-region"
                                label="Assigned Region"
                                hint="Automatically assigned (your region)."
                            >
                                <input
                                    id="driver-region"
                                    value={regionName}
                                    readOnly
                                    disabled
                                />
                            </Field>

                            <Field
                                id="driver-hub"
                                label="Main Depot / Hub"
                                required
                                error={fieldErrors.hub}
                            >
                                <input
                                    {...inputProps("hub")}
                                    list="driver-hub-list"
                                    placeholder="e.g. Radès Main Hub"
                                />
                                <datalist id="driver-hub-list">
                                    {HUB_SUGGESTIONS.map((hub) => (
                                        <option key={hub} value={hub} />
                                    ))}
                                </datalist>
                            </Field>

                            <Field
                                id="driver-isActive"
                                label={isEdit ? "Account Status" : "Initial Status"}
                            >
                                <select {...inputProps("isActive")}>
                                    <option value="true">Available (Active)</option>
                                    <option value="false">Suspendu / Inactive</option>
                                </select>
                            </Field>
                        </div>
                    </div>

                    <div className="driver-info-card">
                        <Info size={18} />
                        <div>
                            <strong>
                                {isEdit
                                    ? "Dynamic Vehicle Assignment"
                                    : "Vehicle Assignment Policy"}
                            </strong>
                            <p>
                                Vehicle assignment is handled dynamically when each mission starts. Initial registration only grants the driver access permissions for the regional fleet.
                            </p>
                        </div>
                    </div>

                    <div className="driver-form-footer">
                        {isEdit ? (
                            <button
                                type="button"
                                className="button-danger"
                                onClick={() => setDeleting(true)}
                                disabled={saving}
                            >
                                <Trash2 size={15} />
                                Remove / Delete Driver
                            </button>
                        ) : (
                            <span />
                        )}

                        <div className="driver-form-footer-actions">
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => (onClose ? onClose() : navigate("/drivers"))}
                                disabled={saving}
                            >
                                <X size={15} />
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="button-primary"
                                disabled={saving}
                            >
                                {saving ? (
                                    <LoaderCircle size={15} className="loading-spinner" />
                                ) : (
                                    <Check size={15} />
                                )}
                                {isEdit
                                    ? "Save Changes"
                                    : "Save Driver"}
                            </button>
                        </div>
                    </div>
                </form>

                {!isEdit && (
                    <aside className="driver-aside">
                        <span className="driver-aside-label">
                            DRIVER ID CARD PREVIEW
                        </span>

                        <div className="driver-pass">
                            <div className="driver-pass-top">
                                <span>REPUBLIC OF TUNISIA</span>
                                <span className="mono-tag">DRIVING LICENCE</span>
                            </div>

                            <div className="driver-pass-id">
                                <div className="driver-avatar large">
                                    {getInitials(form)}
                                </div>
                                <div>
                                    <strong>{previewName || "New Driver"}</strong>
                                    <span>CIN: {form.cin || "—"}</span>
                                    <span
                                        className={
                                            "status-badge " +
                                            (formActive ? "status-mission" : "status-out")
                                        }
                                    >
                                        <span />
                                        {formActive ? "Available" : "Inactive"}
                                    </span>
                                </div>
                            </div>

                            <dl className="driver-pass-data">
                                <div>
                                    <dt>Category</dt>
                                    <dd>
                                        {categoryLabel
                                            ? "Licence " + categoryLabel.value
                                            : "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Licence No.</dt>
                                    <dd>{form.licenseNumber || "—"}</dd>
                                </div>
                                <div>
                                    <dt>Regional Hub</dt>
                                    <dd>{regionName}</dd>
                                </div>
                                <div>
                                    <dt>Main Hub</dt>
                                    <dd>{form.hub || "—"}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="driver-compliance">
                            <h3>
                                <ShieldCheck size={16} />
                                Compliance Check
                            </h3>
                            <p>
                                Ensure the driver has a valid medical examination for the heavy-vehicle licence category before undertaking any inter-governorate mission.
                            </p>
                        </div>
                    </aside>
                )}
            </div>

            {deleting && original && (
                <DeleteDriverModal
                    driver={original}
                    onClose={() => setDeleting(false)}
                    onDone={(message) => {
                        if (onSaved) onSaved(message);
                        else navigate("/drivers", { state: { notice: message } });
                    }}
                />
            )}
        </section>
    );
}

export default DriverForm;
