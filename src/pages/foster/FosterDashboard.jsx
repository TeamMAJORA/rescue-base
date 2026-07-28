import { useEffect, useState } from "react";

import FosterApplication from "./modules/FosterApplication";
import FosterAssignment from "./modules/FosterAssignment";
import DashboardOverview from "./modules/DashboardOverview";
import WeeklyUpdates from "./modules/WeeklyUpdates";

import "../../styles/foster/FosterDashboard.css";
import "../../styles/foster/FosterApplication.css";
import "../../styles/foster/FosterAssignment.css";

import assets from "../../data/assets.json";

const API = import.meta.env.VITE_BACKEND_URL;

export default function FosterDashboard({ setPage }) {

    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    const fosterEmail = String(
        savedUser.email || ""
    ).trim().toLowerCase();

    const fosterName =
        savedUser.username ||
        savedUser.name ||
        "Foster User";

    const [activePage, setActivePage] =
        useState("dashboard");

    const [loading, setLoading] =
        useState(true);

    const [message, setMessage] =
        useState("");

    const [application, setApplication] =
        useState(null);

    const [assignment, setAssignment] =
        useState(null);

    async function fetchApplication() {

        if (!fosterEmail) return;

        try {

            const response = await fetch(
                `${API}/api/foster/applications/applicant/${encodeURIComponent(fosterEmail)}`
            );

            const data = await response.json();

            if (data.success) {
                setApplication(data.application);
            }

        } catch (error) {
            console.error(error);
        }

    }

    async function fetchAssignment() {

        if (!fosterEmail) return;

        try {

            const response = await fetch(
                `${API}/api/foster/assignments/foster/${encodeURIComponent(fosterEmail)}/active`
            );

            const data = await response.json();

            if (data.success) {
                setAssignment(data.assignment);
            }

        } catch (error) {
            console.error(error);
        }

    }

    async function loadDashboard() {

        try {

            setLoading(true);

            await Promise.all([
                fetchApplication(),
                fetchAssignment(),
            ]);

        } finally {

            setLoading(false);

        }

    }

    useEffect(() => {

        loadDashboard();

    }, []);

    function renderContent() {

        switch (activePage) {

            case "dashboard":

                return (
                    <DashboardOverview
                        fosterName={fosterName}
                        application={application}
                        assignment={assignment}
                    />
                );

            case "application":

                return (
                    <FosterApplication
                        application={application}
                        refresh={fetchApplication}
                    />
                );

            case "assignment":

                return (
                    <FosterAssignment
                        assignment={assignment}
                        refresh={fetchAssignment}
                    />
                );

            case "updates":

                return (
                    <WeeklyUpdates
                        assignment={assignment}
                        refresh={fetchAssignment}
                    />
                );

            case "history":

                return (
                    <FosterHistory
                        assignment={assignment}
                    />
                );

            default:

                return "dashboard";

        }

    }

    return (

        <main className="foster-page">

            <aside className="foster-sidebar">

                <div className="foster-logo">

                    <img
                        src={assets.logo}
                        alt="RescueBase"
                    />

                    <span>RescueBase</span>

                </div>

                <nav className="foster-menu">

                    <button
                        className={activePage === "dashboard" ? "active" : ""}
                        onClick={() => setActivePage("dashboard")}
                    >
                        Dashboard
                    </button>

                    <button
                        className={activePage === "assignment" ? "active" : ""}
                        onClick={() => setActivePage("assignment")}
                    >
                        My Foster Pet
                    </button>

                    <button
                        className={activePage === "updates" ? "active" : ""}
                        onClick={() => setActivePage("updates")}
                    >
                        Weekly Updates
                    </button>

                    <button
                        className={activePage === "history" ? "active" : ""}
                        onClick={() => setActivePage("history")}
                    >
                        History
                    </button>

                    <button
                        className={activePage === "application" ? "active" : ""}
                        onClick={() => setActivePage("application")}
                    >
                        My Application
                    </button>

                </nav>

                <button
                    className="foster-logout"
                    onClick={() => setPage("home")}
                >
                    Logout
                </button>

            </aside>

            <section className="foster-main">

                <header className="foster-topbar">

                    <div>

                        <h1>
                            Foster Dashboard
                        </h1>

                        <p>
                            Welcome back, {fosterName}
                        </p>

                    </div>

                    <button onClick={loadDashboard}>
                        Refresh
                    </button>

                </header>

                {loading
                    ? <p>Loading...</p>
                    : renderContent()
                }

            </section>

        </main>

    );

}