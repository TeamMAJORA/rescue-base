import { useEffect, useState } from "react";
import "./styles/App.css";
import "./animations/AppAnimation.css";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/adopter/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import FosterDashboard from "./pages/foster/FosterDashboard";
import StaffDashboard from "./pages/admin/StaffDashboard";
import VolunteerDashboard from "./pages/volunteer/VolunteerDashboard";
import PublicPetProfile from "./pages/PublicPetProfile";
import LandingPage from "./pages/LandingPage";

// After a browser refresh, reopen the logged-in user's dashboard instead of the landing page
function getStartPage() {
    try {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("rescuebase_user") || "null");

        if (!token || !user) return "home";

        const role = String(user.role || "adopter").trim().toLowerCase();
        const pages = { admin: "admin", staff: "staff", foster: "foster", volunteer: "volunteer" };

        return pages[role] || "dashboard";
    } catch {
        return "home";
    }
}

const API = import.meta.env.VITE_BACKEND_URL;

//moving maintenance message out in the landing page and login page
function MaintenanceTicker() {
    const [message, setMessage] = useState("");
    const [closed, setClosed] = useState(false);

    useEffect(() => {
        let active = true;

        async function check() {
            try {
                const response = await fetch(`${API}/api/settings/status`);
                const data = await response.json();

                if (active) {
                    setMessage(data?.maintenance?.enabled ? data.maintenance.message || "RescueBase is under maintenance." : "");
                }
            } catch {
                // server unreachable: show nothing
            }
        }

        check();
        const interval = setInterval(check, 60000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []);

    if (!message || closed) return null;

    return (
        <div className="rb-ticker" role="status" aria-live="polite">
            <span className="rb-ticker-tag">
                <i aria-hidden="true" />
                Maintenance
            </span>

            <div className="rb-ticker-track">
                {/* Two copies so the scroll loops without a gap */}
                <div className="rb-ticker-move">
                    {[0, 1].map((copy) => (
                        <span key={copy} aria-hidden={copy === 1}>
                            {message}
                            <b aria-hidden="true">•</b>
                            {message}
                            <b aria-hidden="true">•</b>
                        </span>
                    ))}
                </div>
            </div>

            <button
                type="button"
                className="rb-ticker-close"
                aria-label="Hide maintenance notice"
                onClick={() => setClosed(true)}
            >
                ×
            </button>
        </div>
    );
}

export default function App() {
    const [page, setPage] = useState(getStartPage);
    const petMatch = window.location.pathname.match(/^\/pet\/([^/]+)/);
    if (petMatch) return <PublicPetProfile tagCode={decodeURIComponent(petMatch[1])} />;
    
    if (page === "auth" || page === "login") {
        return (
            <>
                <MaintenanceTicker />
                <AuthPage
                    mode="login"
                    setPage={setPage}
                />
            </>
        );
    }

    if (page === "signup") {
        return (
            <>
                <MaintenanceTicker />
                <AuthPage
                    mode="signup"
                    setPage={setPage}
                />
            </>
        );
    }

    if (page === "dashboard") {
        return (
            <Dashboard
                onLogout={() => setPage("home")}
                onLoginAgain={() => setPage("auth")}
                onOpenFoster={() => setPage("foster")}
            />
        );
    }

    if (page === "foster") {
        return (
            <FosterDashboard
                setPage={setPage}
            />
        );
    }

    if (page === "admin") {
        return (
            <AdminDashboard
                setPage={setPage}
            />
        );
    }

    if (page === "staff") {
        return (
            <StaffDashboard
                setPage={setPage}
            />
        );
    }

    if (page === "volunteer") {
        return (
            <VolunteerDashboard
                setPage={setPage}
            />
        );
    }

    return (
        <>
            <MaintenanceTicker />
            <LandingPage
                onLogin={() => setPage("auth")}
                onSignup={() => setPage("signup")}
            />
        </>
    );
}