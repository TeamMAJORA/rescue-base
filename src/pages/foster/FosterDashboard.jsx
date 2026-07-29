import { useEffect, useMemo, useState } from "react";

import DashboardOverview from "./modules/DashboardOverview";
import FosterApplication from "./modules/FosterApplication";
import FosterAssignment from "./modules/FosterAssignment";
import WeeklyUpdates from "./modules/WeeklyUpdates";
import FosterHistory from "./modules/FosterHistory";
import FosterNotifications from "./modules/FosterNotifications";

import "../../styles/foster/FosterDashboard.css";
import "../../styles/foster/FosterApplication.css";
import "../../styles/foster/FosterAssignment.css";
import "../../styles/foster/DashboardOverview.css"
import "../../styles/foster/WeeklyUpdates.css";
import "../../styles/foster/FosterHistory.css";
import "../../styles/foster/FosterNotifications.css";

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

    const [activePage, setActivePage] = useState("dashboard");
    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState(null);
    const [assignment, setAssignment] = useState(null);
    const [message, setMessage] = useState("");
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);


    async function fetchApplication() {
        if (!fosterEmail) {
            setApplication(null);
            return;
        }

        try {
            const response = await fetch(
                `${API}/api/foster/applications/applicant/${encodeURIComponent(fosterEmail)}`
            );
            const data = await response.json();

            if (response.ok && data.success) {
                setApplication(data.application);
            } else {
                setApplication(null);
            }

        } catch (error) {
            console.error(error);
            setApplication(null);
        }
    }

    async function fetchAssignment() {
        if (!fosterEmail) {
            setAssignment(null);
            return;
        }

        try {
            const response = await fetch(
                `${API}/api/foster/assignments/foster/${encodeURIComponent(fosterEmail)}/active`
            );

            const data = await response.json();

            if (response.ok && data.success) {
                setAssignment(data.assignment);
            } else {
                setAssignment(null);
            }
        } catch (error) {
            console.error(error);
            setAssignment(null);
        }
    }

    async function loadDashboard() {
        try {
            setLoading(true);
            setMessage("");

            await Promise.all([
                fetchApplication(),
                fetchAssignment(),
            ]);
        } catch (error) {
            console.error(error);
            setMessage(
                "Unable to load dashboard."
            );
        } finally {

            setLoading(false);

        }
    }

    async function loadNotifications() {
        if (!fosterEmail) return;

        try {
            const response = await fetch(
                `${API}/api/foster/notifications/${encodeURIComponent(fosterEmail)}`
            );

            const data = await response.json();

            if (response.ok && data.success) {
                setNotifications(data.notifications || []);

                setUnreadCount(
                    (data.notifications || []).filter(
                        notification => !notification.isRead
                    ).length
                );
            }
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        loadDashboard();
        loadNotifications();
    }, []);

    const pages = useMemo(() => ({

        dashboard: (
            <DashboardOverview
                fosterName={fosterName}
                application={application}
                assignment={assignment}
            />
        ),

        application: (
            <FosterApplication
                application={application}
                refresh={fetchApplication}
            />
        ),

        assignment: (
            <FosterAssignment
                assignment={assignment}
                refresh={fetchAssignment}
            />
        ),

        updates: (
            <WeeklyUpdates
                assignment={assignment}
                refreshAssignment={fetchAssignment}
            />
        ),

        history: (
            <FosterHistory
                assignment={assignment}
            />
        ),

        notifications: (
            <FosterNotifications
                open={notificationsOpen}
                notifications={notifications}
                onClose={() =>
                    setNotificationsOpen(false)
                }
                setActivePage={setActivePage}
                refresh={loadNotifications}
            />
        ),

    }), [
        application,
        assignment,
        fosterName,
    ]);

    return (

        <main className="foster-page">

            <aside className="foster-sidebar">

                <div className="foster-logo">

                    <img
                        src={assets.logo}
                        alt="RescueBase"
                    />

                    <span>
                        RescueBase
                    </span>

                </div>

                <nav className="foster-menu">

                    <button
                        className={
                            activePage === "dashboard"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActivePage("dashboard")
                        }
                    >
                        Dashboard
                    </button>

                    <button
                        className={
                            activePage === "assignment"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActivePage("assignment")
                        }
                    >
                        My Foster Pet
                    </button>

                    <button
                        className={
                            activePage === "updates"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActivePage("updates")
                        }
                    >
                        Weekly Updates
                    </button>

                    <button
                        className={
                            activePage === "history"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActivePage("history")
                        }
                    >
                        Foster History
                    </button>

                    <button
                        className={
                            activePage === "application"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActivePage("application")
                        }
                    >
                        My Application
                    </button>
                </nav>

                <button
                    className="foster-logout"
                    onClick={() =>
                        setPage("home")
                    }
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
                            Welcome back,
                            {" "}
                            <strong>
                                {fosterName}
                            </strong>
                        </p>

                    </div>

                    <div className="foster-topbar-actions">
                        <button
                            className="foster-notification-button"
                            onClick={() =>
                                setNotificationsOpen(!notificationsOpen)
                            }
                        >
                            B
                            {unreadCount > 0 && (
                                <span className="notification-badge">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => {
                                loadDashboard();
                                loadNotifications();
                            }}
                        >
                            Refresh
                        </button>
                    </div>
                </header>

                <FosterNotifications
                    open={notificationsOpen}
                    notifications={notifications}
                    onClose={() => setNotificationsOpen(false)}
                    setActivePage={setActivePage}
                    refresh={loadNotifications}
                />

                <section className="foster-panel foster-dashboard-banner">
                    <div>
                        <span className="foster-label">
                            Foster Status
                        </span>

                        <h2>
                            {assignment
                                ? assignment.petName
                                : "No Active Foster"}
                        </h2>

                        <p>
                            {assignment
                                ? "You currently have an active foster assignment."
                                : "You don't have an active foster assignment yet."}

                        </p>

                    </div>

                    <div className="foster-dashboard-status">

                        <span>
                            Application
                        </span>

                        <strong
                            className={`status ${application?.status ||
                                "pending"
                                }`}
                        >
                            {
                                application?.status ||
                                "Not Submitted"
                            }
                        </strong>

                    </div>

                </section>

                {message && (

                    <div className="foster-message">

                        {message}

                    </div>

                )}

                {loading ? (

                    <section className="foster-panel">

                        <p>
                            Loading dashboard...
                        </p>

                    </section>

                ) : (

                    pages[activePage]

                )}

            </section>

        </main>

    );

}