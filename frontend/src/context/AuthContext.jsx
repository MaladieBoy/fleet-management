import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    async function refreshUser() {
        try {
            const response = await api.get("/auth/me");
            setUser(response.data.user);
            return response.data.user;
        } catch {
            setUser(null);
            return null;
        }
    }

    async function logout() {
        try {
            await api.post("/auth/logout");
        } finally {
            setUser(null);
        }
    }

    useEffect(() => {
        refreshUser().finally(() => setLoading(false));
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, loading, refreshUser, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}
