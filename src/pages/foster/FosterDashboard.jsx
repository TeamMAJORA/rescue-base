import { useEffect, useState } from "react";

import FosterApplication from "./modules/FosterApplication";
import FosterAssignment from "./modules/FosterAssignment";

import "../../styles/foster/FosterDashboard.css";
import "../../styles/foster/FosterApplication.css";
import "../../styles/foster/FosterAssignment.css";

import assets from "../../data/assets.json";

const API = import.meta.env.VITE_BACKEND_URL;

export default function FosterDashboard({ setPage }) {
    const savedUser = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");

    const fosterEmail = String(savedUser.email || "").trim().toLowerCase();
    const fosterName = savedUser.username || savedUser.name || "Foster User";

    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const [application, setApplication] = useState(null);
    const [assignment, setAssignment] = useState(null);

    async function fetchFosterApplication() {
        if (!fosterEmail) {
            setApplication(null);
            return;
        }

        const response = await fetch(
            `${API}/api/foster/applications/applicant/${encodeURIComponent(fosterEmail)}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            setApplication(null);
            return;
        }

        setApplication(data.application || null);
    }

    async function fetchAssignment() {
        if (!fosterEmail) {
            setAssignment(null);
            setMessage("No foster email found. Please log in again.");
            return;
        }

        const response = await fetch(
            `${API}/api/foster/assignments/foster/${encodeURIComponent(fosterEmail)}/active`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            setAssignment(null);
            setMessage(data.message || "Failed to fetch foster assignment.");
            return;
        }

        setAssignment(data.assignment || null);
    }

    async function fetchFosterData() {
        try {
            setLoading(true);
            setMessage("");

            await Promise.all([
                fetchFosterApplication(),
                fetchAssignment(),
            ]);
        } catch (error) {
            console.error("Fetch foster data error:", error);
            setMessage("Server error while loading foster dashboard.");
        } finally {
            setLoading(false);
        }
    }

    function formatDate(dateValue) {
        if (!dateValue) return "N/A";

        return new Date(dateValue).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function renderOverview() {
        return (
            <section className="foster-overview">
                <div className="foster-stat-grid">
                    <article className="foster-stat-card">
                        <span>Application Status</span>
                        <strong>{application?.status || "Not Submitted"}</strong>
                    </article>

                    <article className="foster-stat-card">
                        <span>Active Assignment</span>
                        <strong>{assignment ? assignment.petName : "None"}</strong>
                    </article>

                    <article className="foster-stat-card">
                        <span>Weekly Updates</span>
                        <strong>{assignment?.updates?.length || 0}</strong>
                    </article>
                </div>

                <section className="foster-panel foster-welcome-panel">
                    <div>
                        <p className="foster-label">Welcome back</p>
                        <h2>{fosterName}</h2>
                        <p>
                            Submit your foster application, wait for shelter approval,
                            then view your active foster assignment and submit weekly updates.
                        </p>
                    </div>

                    <div className="foster-quick-actions">
                        <button type="button" onClick={() => setActiveTab("application")}>
                            View Application
                        </button>

                        <button type="button" onClick={() => setActiveTab("assignment")}>
                            View Assignment
                        </button>
                    </div>
                </section>

                {message && <p className="foster-message">{message}</p>}
            </section>
        );
    }


    function renderFosterContent() {

        switch (activeTab) {

            case "overview":
                return renderOverview();

            case "application":
                return (
                    <FosterApplication
                        fosterName={fosterName}
                        fosterEmail={fosterEmail}
                        application={application}
                        setApplication={setApplication}
                        fetchFosterApplication={fetchFosterApplication}
                    />
                );

            case "assignment":
                return (
                    <FosterAssignment/>
                );

            default:
                return renderOverview();

        }

    }

    useEffect(() => {
        fetchFosterData();
    }, []);

    return (
        <main className="foster-page">
            <aside className="foster-sidebar">
                <div className="foster-logo">
                    <img src={assets.logo} alt="RescueBase logo" />
                    <span>RescueBase</span>
                </div>

                <nav className="foster-menu">
                    <button
                        className={activeTab === "overview" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("overview")}
                    >
                        Overview
                    </button>

                    <button
                        className={activeTab === "application" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("application")}
                    >
                        Foster Application
                    </button>

                    <button
                        className={activeTab === "assignment" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("assignment")}
                    >
                        Active Assignment
                    </button>

                    <button
                        className={activeTab === "updates" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("updates")}
                    >
                        Weekly Updates
                    </button>

                    <button
                        className={activeTab === "messages" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("messages")}
                    >
                        Messages
                    </button>
                </nav>

                <button
                    className="foster-logout"
                    type="button"
                    onClick={() => setPage("home")}
                >
                    Logout
                </button>
            </aside>

            <section className="foster-main">
                <header className="foster-topbar">
                    <div>
                        <h1>Foster Dashboard</h1>
                        <p>Welcome back, {fosterName}.</p>
                    </div>

                    <button type="button" onClick={fetchFosterData}>
                        Refresh
                    </button>
                </header>

                {renderFosterContent()}
            </section>
        </main>
    );
}