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
    Truck,
    ContactRound,
    UserRound,
    Settings,
    LogOut,
    Search,
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
import "./App.css";

const navigation = [
    { path: "/regions", label: "Region Management", icon: Building2 },
    { path: "/vehicles", label: "Vehicle Management", icon: Truck },
    { path: "/drivers", label: "Driver Management", icon: ContactRound },
];

function Sidebar({ open, onClose }) {
    return (
        <>
            <div
                className={`sidebar-overlay ${open ? "visible" : ""}`}
                onClick={onClose}
            />

            <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
                <NavLink to="/vehicles" className="brand" onClick={onClose}>
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
                    {navigation.map((item) => {
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

                    <div className="sidebar-link logout-disabled">
                        <LogOut size={17} />
                        <span>Logout</span>
                        <span className="coming-soon">Soon</span>
                    </div>
                </div>
            </aside>
        </>
    );
}

function Topbar({ onMenuOpen }) {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    function handleSearch(event) {
        event.preventDefault();

        const value = search.trim();

        if (value) {
            navigate(`/vehicles?search=${encodeURIComponent(value)}`);
        } else {
            navigate("/vehicles");
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
                    <span>Nœud Régional : Radès Hub</span>
                </div>

                <form className="global-search" onSubmit={handleSearch}>
                    <Search size={16} />
                    <input
                        type="search"
                        placeholder="Rechercher matricule, chauffeur..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <kbd>⌘K</kbd>
                </form>

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
                            <p>Aucune nouvelle notification.</p>
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
                            <strong>Compte régional</strong>
                            <p>Authentification à intégrer.</p>
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
                <span>Fleet & Parc</span>
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
                <h2>Module en préparation</h2>
                <p>
                    Cette interface sera connectée à son API lorsque le module
                    correspondant sera disponible.
                </p>
            </div>
        </section>
    );
}

function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
                        <Route path="/" element={<Navigate to="/vehicles" replace />} />
                        <Route path="/vehicles" element={<Vehicles />} />
                        <Route path="/regions" element={<Regions />} />
                        <Route path="/vehicles/new" element={<VehicleForm />} />
                        <Route path="/vehicles/:id/edit" element={<VehicleForm />} />
                        <Route
                            path="/drivers"
                            element={
                                <PagePlaceholder
                                    title="Driver Management"
                                    description="Gestion des chauffeurs et des affectations."
                                />
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <PagePlaceholder
                                    title="Profile"
                                    description="Informations du compte utilisateur."
                                />
                            }
                        />
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
            <AppLayout />
        </BrowserRouter>
    );
}

export default App;
