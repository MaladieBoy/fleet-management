import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Truck, ShieldCheck } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

function Login() {
    const navigate = useNavigate();
    const { user, loading: authLoading, refreshUser } = useAuth();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (authLoading) {
        return (
            <div className="auth-loading">
                <div className="auth-loading-spinner" />
                <p>Checking authentication...</p>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/vehicles" replace />;
    }

    async function handleGoogleSuccess(response) {
        setError("");
        setLoading(true);

        try {
            await api.post("/auth/google", {
                credential: response.credential
            });

            const authenticatedUser = await refreshUser();

            if (!authenticatedUser) {
                throw new Error("Could not establish your session.");
            }

            navigate("/vehicles", { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Authentication failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="login-page">
            <section className="login-panel">
                <div className="login-brand-icon">
                    <Truck size={30} />
                </div>

                <div className="login-brand-name">FleetMaster</div>
                <div className="login-brand-subtitle">
                    FLEET MANAGEMENT SYSTEM
                </div>

                <div className="login-divider" />

                <h1>Welcome back</h1>
                <p className="login-description">
                    Sign in with your authorized Google account to access
                    the FleetMaster platform.
                </p>

                <div className="login-google-button">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError("Google sign-in failed.")}
                        theme="filled_black"
                        shape="rectangular"
                        size="large"
                        text="signin_with"
                        width="320"
                    />
                </div>

                {loading && (
                    <p className="login-status">Signing you in...</p>
                )}

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                <div className="login-security">
                    <ShieldCheck size={16} />
                    <span>Restricted access · Authorized accounts only</span>
                </div>
            </section>

            <footer className="login-footer">
                FLEETMASTER · SECURE ACCESS
            </footer>
        </main>
    );
}

export default Login;
