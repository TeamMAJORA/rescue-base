import { useState } from "react";
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

export default function App() {
    const [page, setPage] = useState(getStartPage);
    const petMatch = window.location.pathname.match(/^\/pet\/([^/]+)/);
    if (petMatch) return <PublicPetProfile tagCode={decodeURIComponent(petMatch[1])} />;
    
    if (page === "auth" || page === "login") {
        return (
            <AuthPage
                mode="login"
                setPage={setPage}
            />
        );
    }

    if (page === "signup") {
        return (
            <AuthPage
                mode="signup"
                setPage={setPage}
            />
        );
    }

    if (page === "dashboard") {
        return (
            <Dashboard
                onLogout={() => setPage("home")}
                onLoginAgain={() => setPage("auth")}
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
        <LandingPage
            onLogin={() => setPage("auth")}
            onSignup={() => setPage("signup")}
        />
    );
}