import { useState } from "react";
import "./styles/App.css";
import "./animations/AppAnimation.css";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/adopter/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import FosterDashboard from "./pages/foster/FosterDashboard";
import StaffDashboard from "./pages/admin/StaffDashboard";
import VolunteerDashboard from "./pages/volunteer/VolunteerDashboard";
import LandingPage from "./pages/LandingPage";

export default function App() {
    const [page, setPage] = useState("home");

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