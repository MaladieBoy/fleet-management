import { useEffect, useState } from "react";
import {
    UserRound,
    Mail,
    Phone,
    ShieldCheck,
    MapPin,
    Save,
    X,
    LoaderCircle,
    Fingerprint,
    UserPlus,
    CalendarDays,
    Clock,
    CircleCheck,
    CircleX
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

function Profile() {
    const { refreshUser } = useAuth();

    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        phoneNumber: ""
    });
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        async function loadProfile() {
            try {
                const response = await api.get("/auth/profile");
                const user = response.data.user;

                setProfile(user);
                setForm({
                    firstName: user.firstName || "",
                    lastName: user.lastName || "",
                    phoneNumber: user.phoneNumber || ""
                });
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    "Unable to load your profile."
                );
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    function cancelEditing() {
        setForm({
            firstName: profile.firstName || "",
            lastName: profile.lastName || "",
            phoneNumber: profile.phoneNumber || ""
        });

        setEditing(false);
        setError("");
        setSuccess("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.firstName.trim() || !form.lastName.trim()) {
            setError("First name and last name are required.");
            return;
        }

        const phoneNumber = form.phoneNumber.trim();

        if (phoneNumber && !/^\+?[0-9\s().-]{7,20}$/.test(phoneNumber)) {
            setError("Please enter a valid phone number.");
            return;
        }

        setSaving(true);

        try {
            const response = await api.put("/auth/profile", {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                phoneNumber
            });

            setProfile(response.data.user);

            setForm({
                firstName: response.data.user.firstName,
                lastName: response.data.user.lastName,
                phoneNumber: response.data.user.phoneNumber || ""
            });

            await refreshUser();

            setEditing(false);
            setSuccess("Your profile has been updated successfully.");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update your profile."
            );
        } finally {
            setSaving(false);
        }
    }

    function formatDate(value) {
        if (!value) return "Not available";

        return new Date(value).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    if (loading) {
        return (
            <div className="profile-loading">
                <LoaderCircle className="profile-spinner" size={25} />
                Loading profile...
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="profile-page">
                <div className="profile-alert error">
                    {error || "Profile unavailable."}
                </div>
            </div>
        );
    }

    const roleLabels = {
        general_director: "General Director",
        regional_director: "Regional Director",
        driver: "Driver"
    };

    const regionName = profile.region
        ? `${profile.region.name || "Unknown region"}${
            profile.region.location
                ? ` - ${profile.region.location}`
                : ""
        }`
        : "Not assigned";

    const creatorName = profile.createdBy
        ? `${profile.createdBy.firstName} ${profile.createdBy.lastName}`
        : "System / Initial account";

    const initials = (
        `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`
    ).toUpperCase();

    return (
        <div className="profile-page">
            <div className="profile-page-header">
                <div>
                    <span className="profile-eyebrow">
                        ACCOUNT SETTINGS
                    </span>
                    <h1>My Profile</h1>
                    <p>
                        View your personal information and account details.
                    </p>
                </div>
            </div>

            {error && (
                <div className="profile-alert error">{error}</div>
            )}

            {success && (
                <div className="profile-alert success">{success}</div>
            )}

            <section className="profile-overview">
                <div className="profile-avatar">
                    {initials || <UserRound size={30} />}
                </div>

                <div className="profile-overview-info">
                    <h2>
                        {profile.firstName} {profile.lastName}
                    </h2>

                    <p>{profile.email}</p>

                    <span className="profile-role-badge">
                        <ShieldCheck size={14} />
                        {roleLabels[profile.role] || profile.role}
                    </span>
                </div>

                <div className={`profile-status ${profile.isActive ? "active" : "inactive"}`}>
                    {profile.isActive
                        ? <CircleCheck size={16} />
                        : <CircleX size={16} />
                    }
                    {profile.isActive ? "Active account" : "Inactive account"}
                </div>
            </section>

            <section className="profile-details-card">
                <div className="profile-card-heading">
                    <div>
                        <h2>Personal Information</h2>
                        <p>
                            Your name and phone number can be modified.
                        </p>
                    </div>

                    {!editing && (
                        <button
                            type="button"
                            className="profile-edit-button"
                            onClick={() => {
                                setEditing(true);
                                setSuccess("");
                                setError("");
                            }}
                        >
                            Edit profile
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="profile-fields">
                        <div className="profile-field">
                            <label htmlFor="profile-first-name">
                                First name
                            </label>

                            <div className="profile-input-wrap">
                                <UserRound size={17} />

                                <input
                                    id="profile-first-name"
                                    value={form.firstName}
                                    disabled={!editing || saving}
                                    onChange={event =>
                                        setForm({
                                            ...form,
                                            firstName: event.target.value
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="profile-field">
                            <label htmlFor="profile-last-name">
                                Last name
                            </label>

                            <div className="profile-input-wrap">
                                <UserRound size={17} />

                                <input
                                    id="profile-last-name"
                                    value={form.lastName}
                                    disabled={!editing || saving}
                                    onChange={event =>
                                        setForm({
                                            ...form,
                                            lastName: event.target.value
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="profile-field">
                            <label htmlFor="profile-phone-number">
                                Phone number
                            </label>

                            <div className="profile-input-wrap">
                                <Phone size={17} />

                                <input
                                    id="profile-phone-number"
                                    type="tel"
                                    value={form.phoneNumber}
                                    disabled={!editing || saving}
                                    placeholder="Enter your phone number"
                                    onChange={event =>
                                        setForm({
                                            ...form,
                                            phoneNumber: event.target.value
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="profile-field">
                            <label>Email address</label>

                            <div className="profile-readonly">
                                <Mail size={17} />
                                <span>{profile.email}</span>
                            </div>

                            <small>
                                Managed through Google authentication.
                            </small>
                        </div>

                        <div className="profile-field">
                            <label>Google ID</label>

                            <div className="profile-readonly">
                                <Fingerprint size={17} />
                                <span>{profile.googleId || "Not linked"}</span>
                            </div>
                        </div>
                    </div>

                    {editing && (
                        <div className="profile-form-actions">
                            <button
                                type="button"
                                className="profile-cancel-button"
                                onClick={cancelEditing}
                                disabled={saving}
                            >
                                <X size={16} />
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="profile-save-button"
                                disabled={saving}
                            >
                                {saving
                                    ? <LoaderCircle className="profile-spinner" size={16} />
                                    : <Save size={16} />
                                }
                                {saving ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    )}
                </form>
            </section>

            <section className="profile-details-card">
                <div className="profile-card-heading">
                    <div>
                        <h2>Account Information</h2>
                        <p>
                            Organizational and administrative account details.
                        </p>
                    </div>
                </div>

                <div className="profile-fields">
                    <div className="profile-field">
                        <label>Account role</label>

                        <div className="profile-readonly">
                            <ShieldCheck size={17} />
                            <span>
                                {roleLabels[profile.role] || profile.role}
                            </span>
                        </div>
                    </div>

                    {profile.role !== "general_director" && (
                        <div className="profile-field">
                            <label>Assigned region</label>

                            <div className="profile-readonly">
                                <MapPin size={17} />
                                <span>{regionName}</span>
                            </div>
                        </div>
                    )}

                    <div className="profile-field">
                        <label>Account status</label>

                        <div className="profile-readonly">
                            {profile.isActive
                                ? <CircleCheck size={17} />
                                : <CircleX size={17} />
                            }
                            <span>
                                {profile.isActive ? "Active" : "Inactive"}
                            </span>
                        </div>
                    </div>

                    <div className="profile-field">
                        <label>Account created by</label>

                        <div className="profile-readonly">
                            <UserPlus size={17} />
                            <span>{creatorName}</span>
                        </div>
                    </div>

                    <div className="profile-field">
                        <label>Created at</label>

                        <div className="profile-readonly">
                            <CalendarDays size={17} />
                            <span>{formatDate(profile.createdAt)}</span>
                        </div>
                    </div>

                    <div className="profile-field">
                        <label>Last updated</label>

                        <div className="profile-readonly">
                            <Clock size={17} />
                            <span>{formatDate(profile.updatedAt)}</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Profile;
