import { useState } from "react";
import {
    BrowserRouter,
    NavLink,
    Navigate,
    Route,
    Routes,
    useNavigate
} from "react-router-dom";
import {
    ClipboardList,
    Truck,
    ContactRound,
    UserRound,
    Settings,
    LogOut,
    Moon,
    Bell,
    Menu,
    X,
    Building2,
    LayoutDashboard,
    ChevronRight
} from "lucide-react";

import Vehicles from "./pages/Vehicles";
import Regions from "./pages/Regions";
import VehicleForm from "./pages/VehicleForm";
import Profile from "./pages/Profile";
import Drivers from "./pages/Drivers";
import DriverForm from "./pages/DriverForm";
import Login from "./pages/Login";
import RequireAuth from "./components/RequireAuth";
import { useAuth } from "./context/AuthContext";
import "./App.css";

const navigation = [
    { path: "/regions", label: "Region Management", icon: Building2 },
    { path: "/vehicles", label: "Vehicle Management", icon: Truck },
    { path: "/missions", label: "Missions", icon: ClipboardList },
    { path: "/drivers", label: "Driver Management", icon: ContactRound },
];

function getNavigationForRole(role) {
    const normalizedRole = String(role || "").trim().toLowerCase();

    if (normalizedRole === "driver") {
        return navigation.filter((item) => item.path === "/missions");
    }

    return navigation.filter((item) => {
        if (item.path === "/missions") return false;
        if (item.path === "/regions") return normalizedRole === "general_director";
        if (item.path === "/drivers") {
            return normalizedRole === "regional_director" ||
                normalizedRole === "general_director";
        }
        return true;
    });
}

function Sidebar({ open, onClose }) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    async function handleLogout() {
        try {
            await logout();
        } finally {
            onClose();
            navigate("/login", { replace: true });
        }
    }

    return (
        <>
            <div
                className={`sidebar-overlay ${open ? "visible" : ""}`}
                onClick={onClose}
            />

            <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
                <NavLink to={user?.role === "driver" ? "/missions" : "/vehicles"} className="brand" onClick={onClose}>
                    <div className="brand-icon">
                        <Truck size={23} />
                    </div>

                    <div className="brand-text">
                        <span className="brand-name">FleetMaster</span>
                        <span className="brand-version">OS CORE V4.2</span>
                    </div>

                    <button
                        type="button"
                        className="mobile-close"
                        onClick={(event) => {
                            event.preventDefault();
                            onClose();
                        }}
                        aria-label="Close navigation"
                    >
                        <X size={19} />
                    </button>
                </NavLink>

                <div className="regional-node">
                    <Building2 size={15} />
                    <span>Regional Node</span>
                    <span className="node-code">TN-01</span>
                </div>

                <div className="sidebar-section-title">
                    OPERATIONS COMMAND
                </div>

                <nav className="main-navigation">
                    {getNavigationForRole(user?.role).map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    `sidebar-link ${isActive ? "active" : ""}`
                                }
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="sidebar-bottom">
                    <div className="sidebar-section-title">
                        REGIONAL TERMINAL
                    </div>

                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? "active" : ""}`
                        }
                        onClick={onClose}
                    >
                        <UserRound size={17} />
                        <span>Profile</span>
                    </NavLink>

                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? "active" : ""}`
                        }
                        onClick={onClose}
                    >
                        <Settings size={17} />
                        <span>Settings</span>
                    </NavLink>

                    <button
                        type="button"
                        className="sidebar-link logout-button"
                        onClick={handleLogout}
                    >
                        <LogOut size={17} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

function Topbar({ onMenuOpen }) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    async function handleLogout() {
        try {
            await logout();
        } finally {
            navigate("/login", { replace: true });
        }
    }


    return (
        <header className="topbar">
            <div className="topbar-left">
                <button
                    type="button"
                    className="mobile-menu-button"
                    onClick={onMenuOpen}
                    aria-label="Open navigation"
                >
                    <Menu size={21} />
                </button>

                <div className="topbar-breadcrumb">
                    <LayoutDashboard size={15} />
                    <span>FleetMaster</span>
                    <ChevronRight size={14} />
                    <span className="breadcrumb-location">
                        Grand Tunis & Cap Bon
                    </span>
                </div>
            </div>

            <div className="topbar-right">
                <div className="region-indicator">
                    <span className="online-dot" />
                    <span>Regional Node: Radès Hub</span>
                </div>


                <div className="connection-indicator" title="API connection status">
                    <span className="online-dot" />
                </div>

                <div className="topbar-icon-group">
                    <span className="theme-icon" title="Dark interface">
                        <Moon size={17} />
                    </span>
                </div>

                <div className="topbar-menu-container">
                    <button
                        type="button"
                        className="topbar-icon-button"
                        onClick={() => {
                            setNotificationsOpen(!notificationsOpen);
                            setProfileOpen(false);
                        }}
                        aria-label="Notifications"
                    >
                        <Bell size={19} />
                        <span className="notification-indicator" />
                    </button>

                    {notificationsOpen && (
                        <div className="topbar-popover">
                            <strong>Notifications</strong>
                            <p>No new notifications.</p>
                        </div>
                    )}
                </div>

                <div className="topbar-menu-container">
                    <button
                        type="button"
                        className="profile-button"
                        onClick={() => {
                            setProfileOpen(!profileOpen);
                            setNotificationsOpen(false);
                        }}
                        aria-label="User profile"
                    >
                        <UserRound size={19} />
                    </button>

                    {profileOpen && (
                        <div className="topbar-popover profile-popover">
                            <strong>{user?.firstName} {user?.lastName}</strong>
                            <p>{user?.email}</p>
                            <span className="profile-role">
                                {user?.role?.replaceAll("_", " ")}
                            </span>

                            <button
                                type="button"
                                className="profile-logout-button"
                                onClick={handleLogout}
                            >
                                <LogOut size={15} />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function PagePlaceholder({ title, description }) {
    return (
        <section className="page-view">
            <div className="page-breadcrumb">
                <span>Fleet & Operations</span>
                <ChevronRight size={14} />
                <span className="breadcrumb-current">{title}</span>
            </div>

            <div className="page-heading">
                <div>
                    <div className="page-eyebrow">
                        <span className="eyebrow-dot" />
                        REGIONAL NODE TN-01
                    </div>
                    <h1>{title}</h1>
                    <p>{description}</p>
                </div>
            </div>

            <div className="placeholder-panel">
                <div className="placeholder-icon">
                    <Building2 size={25} />
                </div>
                <h2>Module Coming Soon</h2>
                <p>
                    This interface will be connected to its API when the module
                    becomes available.
                </p>
            </div>
        </section>
    );
}

function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();

    return (
        <div className="app-shell">
            <Sidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="workspace">
                <Topbar onMenuOpen={() => setSidebarOpen(true)} />

                <main className="page-content">
                    <Routes>
                        <Route path="/" element={<Navigate to={user?.role === "driver" ? "/missions" : "/vehicles"} replace />} />
                        <Route path="/vehicles" element={user?.role === "driver" ? <Navigate to="/missions" replace /> : <Vehicles />} />
                        <Route
                            path="/regions"
                            element={
                                user?.role === "general_director"
                                    ? <Regions />
                                    : <Navigate to="/vehicles" replace />
                            }
                        />
                        <Route path="/vehicles/new" element={user?.role === "driver" ? <Navigate to="/missions" replace /> : <VehicleForm />} />
                        <Route path="/vehicles/:id/edit" element={user?.role === "driver" ? <Navigate to="/missions" replace /> : <VehicleForm />} />
                        <Route
                            path="/drivers"
                            element={
                                ["regional_director", "general_director"].includes(user?.role)
                                    ? <Drivers />
                                    : <Navigate to="/vehicles" replace />
                            }
                        />
                        <Route
                            path="/drivers/new"
                            element={
                                user?.role === "regional_director"
                                    ? <DriverForm />
                                    : <Navigate to="/vehicles" replace />
                            }
                        />
                        <Route
                            path="/drivers/:id/edit"
                            element={
                                user?.role === "regional_director"
                                    ? <DriverForm />
                                    : <Navigate to="/vehicles" replace />
                            }
                        />
                        <Route
                            path="/missions"
                            element={
                                user?.role === "driver" ? (
                                    <PagePlaceholder
                                        title="My Missions"
                                        description="View your assigned missions. Mission management will be available in a future sprint."
                                    />
                                ) : (
                                    <Navigate to="/vehicles" replace />
                                )
                            }
                        />
                        <Route path="/profile" element={<Profile />} />
                        <Route
                            path="/settings"
                            element={
                                <PagePlaceholder
                                    title="Settings"
                                    description="Configuration du système."
                                />
                            }
                        />
                        <Route path="*" element={<Navigate to="/vehicles" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={<RequireAuth />}>
                    <Route path="/*" element={<AppLayout />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
