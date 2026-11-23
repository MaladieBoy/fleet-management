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
                        aria-label="Close"
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
                aria-label="Close message"
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
                    ? "Driver activated successfully."
                    : "Driver deactivated successfully."
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update the account status. Check your server connection."
            );
            setSaving(false);
        }
    }

    return (
        <ModalShell
            eyebrow="CONFIRMATION"
            title={activating ? "Activate Driver" : "Deactivate Driver"}
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
                        Cancel
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
                        {activating ? "Activate" : "Deactivate"}
                    </button>
                </>
            }
        >
            <ModalError message={error} onClose={() => setError("")} />

            <p className="driver-confirm-text">
                Are you sure you want to {activating ? "activate" : "désactivate"} le
                account of <strong>{getFullName(driver)}</strong> ?{" "}
                {activating
                    ? "The driver will be able to sign in again."
                    : "The driver will not be able to sign in while the account is inactive."}
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

            onDone("Driver deleted successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to delete the driver. Check your server connection."
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

            onDone("Driver deactivated successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to deactivate the driver."
            );
            setSaving(false);
        }
    }

    return (
        <ModalShell
            eyebrow="IRREVERSIBLE ACTION"
            title="Delete Driver"
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
                        Cancel
                    </button>

                    {conflict && driver.isActive && (
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={handleDeactivate}
                            disabled={saving}
                        >
                            Deactivate à la place
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
                        Delete
                    </button>
                </>
            }
        >
            <ModalError message={error} onClose={() => setError("")} />

            <p className="driver-confirm-text">
                Are you sure you want to permanently delete this driver
                from the regional workforce? This action cannot be undone.
            </p>

            <div className="driver-delete-card">
                <span className="driver-delete-label">DRIVER</span>

                <div className="driver-identity">
                    <span className="driver-avatar">{getInitials(driver)}</span>
                    <div>
                        <strong>{getFullName(driver)}</strong>
                        <span className="driver-sub">
                            CIN: {driver.cin || "—"} · Licence:{" "}
                            {driver.licenseCategory
                                ? "Category " + driver.licenseCategory
                                : "—"}
                        </span>
                    </div>
                </div>
            </div>
        </ModalShell>
    );
}
