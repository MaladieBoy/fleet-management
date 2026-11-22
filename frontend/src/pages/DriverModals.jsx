import { useState } from "react";
import { LoaderCircle, Trash2, X } from "lucide-react";
import api from "../services/api";
import { getFullName, getInitials } from "./driverUtils";
import "./Drivers.css";

function ModalShell({ eyebrow, title, titleId, saving, onClose, footer, children }) {
    return (
        <div
            className="vehicle-modal-overlay"
            onMouseDown={saving ? undefined : onClose}
        >
            <div
                className="vehicle-modal driver-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="vehicle-modal-header">
                    <div>
                        <span className="modal-eyebrow">{eyebrow}</span>
                        <h2 id={titleId}>{title}</h2>
                    </div>

                    <button
                        type="button"
                        className="icon-button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Fermer"
                    >
                        <X size={19} />
                    </button>
                </div>

                <div className="vehicle-modal-body">{children}</div>

                <div className="vehicle-modal-footer">{footer}</div>
            </div>
        </div>
    );
}

function ModalError({ message, onClose }) {
    if (!message) return null;

    return (
        <div className="form-alert form-alert-error">
            <span>{message}</span>
            <button
                type="button"
                onClick={onClose}
                aria-label="Fermer le message"
            >
                ×
            </button>
        </div>
    );
}

export function StatusConfirmModal({ driver, onClose, onConfirmed }) {
    const activating = !driver.isActive;

    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleConfirm() {
        try {
            setSaving(true);
            setError("");

            await api.patch("/users/" + driver._id + "/status", {
                isActive: activating
            });

            onConfirmed(
                activating
                    ? "Chauffeur activé avec succès."
                    : "Chauffeur désactivé avec succès."
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Impossible de modifier le statut. Vérifiez la connexion au serveur."
            );
            setSaving(false);
        }
    }

    return (
        <ModalShell
            eyebrow="CONFIRMATION"
            title={activating ? "Activer le chauffeur" : "Désactiver le chauffeur"}
            titleId="driver-status-title"
            saving={saving}
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Annuler
                    </button>

                    <button
                        type="button"
                        className={activating ? "button-primary" : "button-danger"}
                        onClick={handleConfirm}
                        disabled={saving}
                    >
                        {saving && (
                            <LoaderCircle size={15} className="loading-spinner" />
                        )}
                        {activating ? "Activer" : "Désactiver"}
                    </button>
                </>
            }
        >
            <ModalError message={error} onClose={() => setError("")} />

            <p className="driver-confirm-text">
                Voulez-vous vraiment {activating ? "activer" : "désactiver"} le
                compte de <strong>{getFullName(driver)}</strong> ?{" "}
                {activating
                    ? "Le chauffeur pourra de nouveau se connecter."
                    : "Le chauffeur ne pourra plus se connecter tant que son compte est inactif."}
            </p>
        </ModalShell>
    );
}

export function DeleteDriverModal({ driver, onClose, onDone }) {
    const [error, setError] = useState("");
    const [conflict, setConflict] = useState(false);
    const [saving, setSaving] = useState(false);

    async function handleDelete() {
        try {
            setSaving(true);
            setError("");
            setConflict(false);

            await api.delete("/users/" + driver._id);

            onDone("Chauffeur supprimé définitivement.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Impossible de supprimer le chauffeur. Vérifiez la connexion au serveur."
            );
            setConflict(err.response?.status === 409);
            setSaving(false);
        }
    }

    async function handleDeactivate() {
        try {
            setSaving(true);
            setError("");

            await api.patch("/users/" + driver._id + "/status", {
                isActive: false
            });

            onDone("Chauffeur désactivé avec succès.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Impossible de désactiver le chauffeur."
            );
            setSaving(false);
        }
    }

    return (
        <ModalShell
            eyebrow="ACTION IRRÉVERSIBLE"
            title="Supprimer le chauffeur"
            titleId="driver-delete-title"
            saving={saving}
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Annuler
                    </button>

                    {conflict && driver.isActive && (
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={handleDeactivate}
                            disabled={saving}
                        >
                            Désactiver à la place
                        </button>
                    )}

                    <button
                        type="button"
                        className="button-danger"
                        onClick={handleDelete}
                        disabled={saving || conflict}
                    >
                        {saving ? (
                            <LoaderCircle size={15} className="loading-spinner" />
                        ) : (
                            <Trash2 size={15} />
                        )}
                        Supprimer
                    </button>
                </>
            }
        >
            <ModalError message={error} onClose={() => setError("")} />

            <p className="driver-confirm-text">
                Êtes-vous sûr de vouloir supprimer définitivement ce chauffeur
                de l'effectif régional ? Cette action est irréversible.
            </p>

            <div className="driver-delete-card">
                <span className="driver-delete-label">CHAUFFEUR</span>

                <div className="driver-identity">
                    <span className="driver-avatar">{getInitials(driver)}</span>
                    <div>
                        <strong>{getFullName(driver)}</strong>
                        <span className="driver-sub">
                            CIN: {driver.cin || "—"} · Permis:{" "}
                            {driver.licenseCategory
                                ? "Cat. " + driver.licenseCategory
                                : "—"}
                        </span>
                    </div>
                </div>
            </div>
        </ModalShell>
    );
}
