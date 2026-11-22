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
        errors.firstName = "Le prénom est obligatoire.";
    }

    if (!form.lastName.trim()) {
        errors.lastName = "Le nom est obligatoire.";
    }

    if (!form.email.trim()) {
        errors.email = "L'adresse email est obligatoire.";
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
        errors.email = "Adresse email invalide.";
    }

    if (!/^\d{8}$/.test(form.cin.trim())) {
        errors.cin = "Le CIN doit contenir exactement 8 chiffres.";
    }

    if (!PHONE_PATTERN.test(form.phoneNumber.trim())) {
        errors.phoneNumber = "Numéro de téléphone invalide.";
    }

    if (form.birthDate) {
        const birth = new Date(form.birthDate);
        const limit = new Date();
        limit.setFullYear(limit.getFullYear() - 18);

        if (Number.isNaN(birth.getTime()) || birth.getFullYear() < 1900) {
            errors.birthDate = "Date de naissance invalide.";
        } else if (birth > limit) {
            errors.birthDate = "Le chauffeur doit avoir au moins 18 ans.";
        }
    }

    if (form.address.trim().length > 200) {
        errors.address = "200 caractères maximum.";
    }

    if (!form.licenseCategory) {
        errors.licenseCategory = "Sélectionnez une catégorie.";
    }

    const licenseNumber = form.licenseNumber.trim();

    if (licenseNumber.length < 3 || licenseNumber.length > 30) {
        errors.licenseNumber = "Entre 3 et 30 caractères.";
    }

    if (
        !form.licenseExpiry ||
        Number.isNaN(new Date(form.licenseExpiry).getTime())
    ) {
        errors.licenseExpiry = "La date d'expiration est obligatoire.";
    }

    const hub = form.hub.trim();

    if (hub.length < 2 || hub.length > 80) {
        errors.hub = "Indiquez le dépôt pivot (2 à 80 caractères).";
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

function DriverForm() {
    const { id } = useParams();
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
                    setLoadError("Chauffeur introuvable dans votre région.");
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
                    "Impossible de charger le chauffeur. Vérifiez la connexion au serveur."
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
            setError("Veuillez corriger les champs indiqués.");
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

            navigate("/drivers", {
                state: {
                    notice: isEdit
                        ? "Chauffeur modifié avec succès."
                        : "Chauffeur créé avec succès."
                }
            });
        } catch (err) {
            const message =
                err.response?.data?.message ||
                "Impossible d'enregistrer le chauffeur. Vérifiez la connexion au serveur.";

            setError(
                profileSaved
                    ? "Profil enregistré, mais le statut n'a pas pu être modifié : " +
                    message
                    : message
            );
            setSaving(false);
        }
    }

    const previewName = (form.firstName + " " + form.lastName).trim();
    const regionName = getRegionName(user?.region) || "Votre région";
    const categoryLabel = LICENSE_CATEGORIES.find(
        (item) => item.value === form.licenseCategory
    );
    const formActive = form.isActive === "true";

    const breadcrumb = (
        <div className="page-breadcrumb">
            <ContactRound size={15} />
            <span>Flotte &amp; Personnel</span>
            <span>/</span>
            <Link to="/drivers" className="breadcrumb-link">
                Chauffeurs
            </Link>
            <span>/</span>
            <span className="breadcrumb-current">
                {isEdit ? "Modifier le chauffeur" : "Nouveau chauffeur"}
            </span>
        </div>
    );

    if (loading) {
        return (
            <section className="page-view">
                {breadcrumb}
                <div className="page-loading">
                    <LoaderCircle size={20} className="loading-spinner" />
                    Chargement du chauffeur...
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
                    onClick={() => navigate("/drivers")}
                >
                    Retour à la liste
                </button>
            </section>
        );
    }

    return (
        <section className="page-view">
            {breadcrumb}

            <div className="page-heading">
                <div>
                    <div className="page-eyebrow">
                        <span className="eyebrow-dot" />
                        {isEdit ? "DOSSIER CHAUFFEUR" : "NOUVEAU DOSSIER"}
                    </div>
                    <h1>{isEdit ? "Modifier le Chauffeur" : "Ajouter un Chauffeur"}</h1>
                    <p>
                        {isEdit
                            ? "Mise à jour des informations administratives, permis et dépôt de rattachement."
                            : "Formulaire d'enregistrement et d'affectation d'un conducteur au pôle régional."}
                    </p>
                </div>
            </div>

            {isEdit && original && (
                <div className="driver-summary">
                    <div className="driver-avatar xl">{getInitials(original)}</div>

                    <div className="driver-summary-body">
                        <span className="driver-summary-eyebrow">
                            PERMIS DE CONDUIRE TUNISIEN
                        </span>
                        <h2>{getFullName(original)}</h2>
                        <p>
                            CIN: <span>{original.cin || "—"}</span> | Permis:{" "}
                            <span>{original.licenseCategory || "—"}</span> | Dépôt:{" "}
                            <span>{original.hub || "—"}</span> | Créé le{" "}
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
                        {original.isActive ? "Actif" : "Inactif"}
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
                                aria-label="Fermer le message"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    <div className="driver-card">
                        <h2 className="driver-card-title">
                            <UserRound size={18} />
                            1. Informations Personnelles &amp; Identité
                        </h2>

                        <div className="driver-grid">
                            <Field
                                id="driver-firstName"
                                label="Prénom"
                                required
                                error={fieldErrors.firstName}
                            >
                                <input {...inputProps("firstName")} placeholder="Ex: Mohamed" />
                            </Field>

                            <Field
                                id="driver-lastName"
                                label="Nom de famille"
                                required
                                error={fieldErrors.lastName}
                            >
                                <input {...inputProps("lastName")} placeholder="Ex: Ben Salem" />
                            </Field>

                            <Field
                                id="driver-email"
                                label="Adresse email (compte Google)"
                                required
                                full
                                hint="Le chauffeur se connectera avec le compte Google correspondant."
                                error={fieldErrors.email}
                            >
                                <input
                                    {...inputProps("email")}
                                    type="email"
                                    placeholder="chauffeur@example.com"
                                />
                            </Field>

                            <Field
                                id="driver-cin"
                                label="Numéro CIN (carte d'identité)"
                                required
                                hint="Identifiant national à 8 chiffres"
                                error={fieldErrors.cin}
                            >
                                <input
                                    {...inputProps("cin")}
                                    inputMode="numeric"
                                    maxLength={8}
                                    placeholder="Ex: 08492147"
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
                                label="Numéro de téléphone"
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
                                label="Adresse de résidence"
                                error={fieldErrors.address}
                            >
                                <input
                                    {...inputProps("address")}
                                    placeholder="Ex: Nouvelle Medina, Ben Arous"
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="driver-card">
                        <h2 className="driver-card-title">
                            <ShieldCheck size={18} />
                            2. Qualification &amp; Affectation Régionale
                        </h2>

                        <div className="driver-grid">
                            <Field
                                id="driver-licenseCategory"
                                label="Catégorie de permis"
                                required
                                error={fieldErrors.licenseCategory}
                            >
                                <select {...inputProps("licenseCategory")}>
                                    <option value="">Sélectionner...</option>
                                    {LICENSE_CATEGORIES.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                id="driver-licenseNumber"
                                label="Numéro de permis de conduire"
                                required
                                error={fieldErrors.licenseNumber}
                            >
                                <input
                                    {...inputProps("licenseNumber")}
                                    placeholder="Ex: 12/489201"
                                />
                            </Field>

                            <Field
                                id="driver-licenseExpiry"
                                label="Date d'expiration du permis"
                                required
                                error={fieldErrors.licenseExpiry}
                            >
                                <input {...inputProps("licenseExpiry")} type="date" />
                            </Field>

                            <Field
                                id="driver-region"
                                label="Région de rattachement"
                                hint="Attribuée automatiquement (votre région)."
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
                                label="Dépôt pivot"
                                required
                                error={fieldErrors.hub}
                            >
                                <input
                                    {...inputProps("hub")}
                                    list="driver-hub-list"
                                    placeholder="Ex: Radès Hub Principal"
                                />
                                <datalist id="driver-hub-list">
                                    {HUB_SUGGESTIONS.map((hub) => (
                                        <option key={hub} value={hub} />
                                    ))}
                                </datalist>
                            </Field>

                            <Field
                                id="driver-isActive"
                                label={isEdit ? "Statut opérationnel" : "Statut initial"}
                            >
                                <select {...inputProps("isActive")}>
                                    <option value="true">Disponible (Actif)</option>
                                    <option value="false">Suspendu / Inactif</option>
                                </select>
                            </Field>
                        </div>
                    </div>

                    <div className="driver-info-card">
                        <Info size={18} />
                        <div>
                            <strong>
                                {isEdit
                                    ? "Attribution Dynamique de Véhicule"
                                    : "Règle Opérationnelle d'Attribution"}
                            </strong>
                            <p>
                                L'assignation du véhicule s'effectue dynamiquement au
                                démarrage de chaque mission. L'enregistrement initial
                                confère uniquement les habilitations et droits d'accès
                                au parc régional.
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
                                Retirer / Supprimer le chauffeur
                            </button>
                        ) : (
                            <span />
                        )}

                        <div className="driver-form-footer-actions">
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => navigate("/drivers")}
                                disabled={saving}
                            >
                                <X size={15} />
                                Annuler
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
                                    ? "Enregistrer les modifications"
                                    : "Enregistrer le Chauffeur"}
                            </button>
                        </div>
                    </div>
                </form>

                {!isEdit && (
                    <aside className="driver-aside">
                        <span className="driver-aside-label">
                            APERÇU DE LA CARTE PROFESSIONNELLE
                        </span>

                        <div className="driver-pass">
                            <div className="driver-pass-top">
                                <span>RÉPUBLIQUE TUNISIENNE</span>
                                <span className="mono-tag">PERMIS DE CONDUIRE</span>
                            </div>

                            <div className="driver-pass-id">
                                <div className="driver-avatar large">
                                    {getInitials(form)}
                                </div>
                                <div>
                                    <strong>{previewName || "Nouveau chauffeur"}</strong>
                                    <span>CIN: {form.cin || "—"}</span>
                                    <span
                                        className={
                                            "status-badge " +
                                            (formActive ? "status-mission" : "status-out")
                                        }
                                    >
                                        <span />
                                        {formActive ? "Disponible" : "Inactif"}
                                    </span>
                                </div>
                            </div>

                            <dl className="driver-pass-data">
                                <div>
                                    <dt>Catégorie</dt>
                                    <dd>
                                        {categoryLabel
                                            ? "Permis " + categoryLabel.value
                                            : "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt>N° permis</dt>
                                    <dd>{form.licenseNumber || "—"}</dd>
                                </div>
                                <div>
                                    <dt>Pôle régional</dt>
                                    <dd>{regionName}</dd>
                                </div>
                                <div>
                                    <dt>Hub pivot</dt>
                                    <dd>{form.hub || "—"}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="driver-compliance">
                            <h3>
                                <ShieldCheck size={16} />
                                Contrôle de Conformité
                            </h3>
                            <p>
                                Assurez-vous que le conducteur possède une visite
                                médicale valide pour la catégorie poids lourd avant
                                d'effectuer toute mission inter-gouvernorats.
                            </p>
                        </div>
                    </aside>
                )}
            </div>

            {deleting && original && (
                <DeleteDriverModal
                    driver={original}
                    onClose={() => setDeleting(false)}
                    onDone={(message) =>
                        navigate("/drivers", { state: { notice: message } })
                    }
                />
            )}
        </section>
    );
}

export default DriverForm;
