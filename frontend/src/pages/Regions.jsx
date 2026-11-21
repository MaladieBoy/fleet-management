import { useEffect, useState } from "react";
import { Building2, Plus, RefreshCw, LoaderCircle, MapPin } from "lucide-react";
import api from "../services/api";

function Regions() {
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: "",
        governorate: "",
        address: ""
    });

    async function loadRegions() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/regions");
            setRegions(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Impossible de charger les régions."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadRegions();
    }, []);

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!form.name.trim() || !form.governorate.trim()) {
            setError("Le nom et le gouvernorat sont obligatoires.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const response = await api.post("/regions", {
                name: form.name.trim(),
                governorate: form.governorate.trim(),
                address: form.address.trim()
            });

            setRegions((previous) => [...previous, response.data]);
            setForm({ name: "", governorate: "", address: "" });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Impossible de créer cette région."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="page-view">
            <div className="page-breadcrumb">
                <Building2 size={15} />
                <span>Gestion du parc</span>
                <span>/</span>
                <span className="breadcrumb-current">Régions</span>
            </div>

            <div className="page-heading">
                <div className="page-eyebrow">
                    <span className="eyebrow-dot" />
                    ADMINISTRATION TERRITORIALE
                </div>
                <h1>Region Management</h1>
                <p>Gestion des régions, gouvernorats et dépôts.</p>
            </div>

            <div className="region-summary">
                <div className="region-summary-icon">
                    <Building2 size={21} />
                </div>
                <div>
                    <span>RÉGIONS ENREGISTRÉES</span>
                    <strong>{regions.length}</strong>
                </div>
            </div>

            <div className="region-layout">
                <form className="region-form-panel" onSubmit={handleSubmit}>
                    <div className="region-panel-heading">
                        <div className="region-panel-icon">
                            <Plus size={18} />
                        </div>
                        <div>
                            <h2>Ajouter une région</h2>
                            <p>Enregistrer une nouvelle région ou un dépôt.</p>
                        </div>
                    </div>

                    <label className="region-field">
                        <span>Nom de la région *</span>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Ex. Région Nord"
                            required
                        />
                    </label>

                    <label className="region-field">
                        <span>Gouvernorat *</span>
                        <input
                            name="governorate"
                            value={form.governorate}
                            onChange={handleChange}
                            placeholder="Ex. Tunis"
                            required
                        />
                    </label>

                    <label className="region-field">
                        <span>Adresse</span>
                        <input
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            placeholder="Adresse du dépôt (facultatif)"
                        />
                    </label>

                    {error && <p className="region-error">{error}</p>}

                    <button
                        type="submit"
                        className="button-primary region-submit"
                        disabled={saving}
                    >
                        {saving ? (
                            <LoaderCircle size={17} className="loading-spinner" />
                        ) : (
                            <Plus size={17} />
                        )}
                        {saving ? "Enregistrement..." : "Créer la région"}
                    </button>
                </form>

                <div className="region-table-panel">
                    <div className="region-table-heading">
                        <div>
                            <h2>Régions enregistrées</h2>
                            <p>Liste des régions disponibles dans le système.</p>
                        </div>
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={loadRegions}
                            disabled={loading}
                        >
                            <RefreshCw size={15} />
                            Actualiser
                        </button>
                    </div>

                    {error && regions.length === 0 && (
                        <p className="region-error region-load-error">{error}</p>
                    )}

                    <div className="region-table-scroll">
                        <table className="region-table">
                            <thead>
                                <tr>
                                    <th>RÉGION</th>
                                    <th>GOUVERNORAT</th>
                                    <th>ADRESSE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="3" className="region-table-message">
                                            <LoaderCircle size={20} className="loading-spinner" />
                                            Chargement des régions...
                                        </td>
                                    </tr>
                                ) : regions.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="region-table-message">
                                            Aucune région enregistrée.
                                        </td>
                                    </tr>
                                ) : (
                                    regions.map((region) => (
                                        <tr key={region._id}>
                                            <td>
                                                <div className="region-name-cell">
                                                    <span className="region-row-icon">
                                                        <MapPin size={16} />
                                                    </span>
                                                    <strong>{region.name}</strong>
                                                </div>
                                            </td>
                                            <td>{region.governorate}</td>
                                            <td>{region.address || "—"}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Regions;
