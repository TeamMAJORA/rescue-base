import { act, useEffect, useMemo, useRef, useState } from "react";

import DashboardOverview from "./modules/DashboardOverview";
import FosterApplication from "./modules/FosterApplication";
import FosterAssignment from "./modules/FosterAssignment";
import WeeklyUpdates from "./modules/WeeklyUpdates";
import FosterHistory from "./modules/FosterHistory";
import FosterNotifications from "./modules/FosterNotifications";
import MedicalAssistance from "./modules/MedicalAssistance";
import FosterUpdates from "./modules/FosterUpdates";
import FeedbackForm from "../FeedbackForm";

import "../../styles/foster/FosterDashboard.css";
import "../../styles/foster/FosterApplication.css";
import "../../styles/foster/FosterAssignment.css";
import "../../styles/foster/DashboardOverview.css"
import "../../styles/foster/WeeklyUpdates.css";
import "../../styles/foster/FosterHistory.css";
import "../../styles/foster/FosterNotifications.css";
import "../../styles/admin/IntakeRecords.css"; // shared page styles (stats strip, cards, traits)

import assets from "../../data/assets.json";

const API = import.meta.env.VITE_BACKEND_URL;

// Title shown in the top bar for each page
const PAGE_TITLES = {
    dashboard: "Dashboard",
    assignment: "My Foster Pet",
    updates: "Care Updates",
    behavior: "Behavior Evaluation",
    fosterUpdates: "Behavior Evaluation",
    history: "Foster History",
    application: "My Application",
    medical: "Medical Assistance",
    notifications: "Notifications",
    feedback: "Feedback",
};

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
    const [confirmRevoke, setConfirmRevoke] = useState(false);
    const [revoking, setRevoking] = useState(false);
    const [revokeError, setRevokeError] = useState("");
    const [assignment, setAssignment] = useState(null);
    const [message, setMessage] = useState("");
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const token = localStorage.getItem("token");

    // Signed out: login expired (server answered 401) or this account is not a foster
    const isWrongRole =
        String(savedUser.role || "").trim().toLowerCase() !== "foster";
    const [signedOut, setSignedOut] = useState(false);
    // Server could not be reached: show "Try again" instead of "no assignment"
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            const url = String(args[0]?.url || args[0] || "");

            if (response.status === 401 && API && url.startsWith(API)) {
                setSignedOut(true);
            }

            return response;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    // "Leave this form?" guard: forms report unsaved changes here
    const formDirtyRef = useRef(false);
    const reportDirty = useRef((value) => {
        formDirtyRef.current = Boolean(value);
    }).current;
    const [pendingLeave, setPendingLeave] = useState(null);

    function guardLeave(action) {
        if (formDirtyRef.current) {
            setPendingLeave({ action });
            return;
        }

        action();
    }

    function goToPage(page) {
        guardLeave(() => setActivePage(page));
    }

    function confirmLeave() {
        const action = pendingLeave?.action;

        formDirtyRef.current = false;
        setPendingLeave(null);
        action?.();
    }

    useEffect(() => {
        // Closing or reloading the browser tab with unsaved changes
        function handleBeforeUnload(event) {
            if (formDirtyRef.current) {
                event.preventDefault();
                event.returnValue = "";
            }
        }

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    function signOut(goTo) {
        localStorage.removeItem("token");
        localStorage.removeItem("rescuebase_user");
        setPage(goTo);
    }

    async function fetchApplication() {
        if (!fosterEmail) {
            setApplication(null);
            return;
        }

        try {
            const response = await fetch(
                `${API}/api/foster/applications/me`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json();

            if (response.status >= 500) {
                setLoadError(true);
            }

            if (response.ok && data.success) {
                setApplication(data.application);
            } else {
                setApplication(null);
            }

        } catch (error) {
            console.error(error);
            setApplication(null);
            setLoadError(true);
        }
    }

    async function revokeApplication() {
        try {
            setRevoking(true);
            setRevokeError("");

            const response = await fetch(`${API}/api/foster/applications/me/withdraw`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({}),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                setRevokeError(data.message || "Could not revoke your application.");
                return;
            }

            setConfirmRevoke(false);

            // No longer a foster: the login token still says "foster", so log out
            if (data.roleChanged) {
                alert(data.message);
                signOut("auth");
                return;
            }

            fetchApplication();
        } catch (error) {
            console.error(error);
            setRevokeError("Server error. Please try again.");
        } finally {
            setRevoking(false);
        }
    }

    async function fetchAssignment() {
        if (!fosterEmail) {
            setAssignment(null);
            return;
        }

        try {
            const response = await fetch(
                `${API}/api/foster/assignments/me/active`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (response.status >= 500) {
                setLoadError(true);
            }

            if (response.ok && data.success) {
                setAssignment(data.assignment);
            } else {
                setAssignment(null);
            }
        } catch (error) {
            console.error(error);
            setAssignment(null);
            setLoadError(true);
        }
    }

    async function loadDashboard() {
        try {
            setLoading(true);
            setMessage("");
            setLoadError(false);

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
        try {
            const response = await fetch(
                `${API}/api/notifications`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                const notificationList = data.notifications || [];

                setNotifications(notificationList);

                setUnreadCount(
                    notificationList.filter(
                        (notification) => !notification.read
                    ).length
                );
            }
        } catch (error) {
            console.error(
                "Load notifications error:",
                error
            );
        }
    }

    useEffect(() => {
        if (isWrongRole || signedOut) return;

        loadDashboard();
        loadNotifications();
    }, [signedOut]);

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
                onDirtyChange={reportDirty}
                refreshAssignment={fetchAssignment}
            />
        ),

        behavior: (
            <FosterUpdates
                assignment={assignment}
                onDirtyChange={reportDirty}
                refreshAssignment={fetchAssignment}
            />
        ),

        // old link name still opens Behavior Evaluation
        fosterUpdates: (
            <FosterUpdates
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
                setActivePage={goToPage}
                refresh={loadNotifications}
            />
        ),

        medical: (
            <MedicalAssistance
                assignment={assignment}
                onDirtyChange={reportDirty}
                refreshAssignment={fetchAssignment}
            />
        ),

        feedback: (
            <FeedbackForm />
        )

    }), [
        application,
        assignment,
        fosterName,
    ]);


    if (signedOut || isWrongRole) {
        return (
            <main className="ao-signed-out">
                <section className="ao-signed-out-card">
                    <div className="ao-signed-out-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <path d="M16 17l5-5-5-5M21 12H9" />
                        </svg>
                    </div>
                    <h2>You've been signed out</h2>
                    <p>Please log in again to continue.</p>
                    <button type="button" onClick={() => signOut("auth")}>
                        Log in again
                    </button>
                </section>
            </main>
        );
    }

    // ----- Foster status banner -----
    const FOSTER_STEPS = ["Personal", "Household", "Preferences", "Experience & Contact"];
    const applicationStatus = application?.status || "none";
    const applicationSubmitted = Boolean(application);

    const BANNER_TEXT = {
        none: {
            title: "No application yet",
            text: "Fill in the foster application so RescueBase staff can review you.",
        },
        pending: {
            title: "Application under review",
            text: "Staff are checking your answers. You'll get a notification once it's decided.",
        },
        approved: {
            title: "Approved — waiting for a match",
            text: "You're an approved foster. The shelter will assign an animal to you soon.",
        },
        rejected: {
            title: "Application not approved",
            text: "You can review your answers and apply again.",
        },
        withdrawn: {
            title: "Application revoked",
            text: "You cancelled your foster application. You can apply again anytime.",
        },
    };

    const banner = assignment
        ? {
            title: `Caring for ${assignment.petName}`,
            text: "You currently have an active foster assignment. Thank you for giving them a home.",
        }
        : BANNER_TEXT[applicationStatus] || BANNER_TEXT.none;

    const STATUS_LABEL = { none: "None", pending: "Pending", approved: "Approved", rejected: "Rejected", withdrawn: "Revoked" };

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
                            goToPage("dashboard")
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
                            goToPage("assignment")
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
                            goToPage("updates")
                        }
                    >
                        Care Updates
                    </button>

                    <button
                        className={
                            activePage === "behavior" || activePage === "fosterUpdates"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            goToPage("behavior")
                        }
                    >
                        Behavior Evaluation
                    </button>

                    <button
                        className={
                            activePage === "history"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            goToPage("history")
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
                            goToPage("application")
                        }
                    >
                        My Application
                    </button>

                    <button
                        className={
                            activePage === "medical"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            goToPage("medical")
                        }
                    >
                        Medical Assistance
                    </button>

                    <button
                        onClick={() =>
                            guardLeave(() => setPage("dashboard"))
                        }
                    >
                        Adopt a Pet
                    </button>

                </nav>

                <button
                    className="foster-logout"
                    onClick={() =>
                        guardLeave(() => signOut("home"))
                    }
                >
                    Logout
                </button>

            </aside>

            <section className="foster-main">

                <header className="foster-topbar">

                    <div>
                        <h1>{PAGE_TITLES[activePage] || "Foster Dashboard"}</h1>

                        {activePage === "dashboard" && (
                            <p>
                                Welcome back, <strong>{fosterName}</strong>
                            </p>
                        )}
                    </div>

                    <div className="foster-topbar-actions">
                        <button
                            className={`foster-notification-button ${notificationsOpen ? "open" : ""}`}
                            type="button"
                            aria-label="Notifications"
                            title="Notifications"
                            onClick={() =>
                                setNotificationsOpen(!notificationsOpen)
                            }
                        >
                            <img
                                className="rb-notif-icon icon-default"
                                src="/icons/sidebar/notification-brown.svg"
                                alt=""
                                aria-hidden="true"
                            />
                            <img
                                className="rb-notif-icon icon-active"
                                src="/icons/sidebar/notification-light.svg"
                                alt=""
                                aria-hidden="true"
                            />
                            {unreadCount > 0 && (
                                <span className="notification-badge">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            className="foster-refresh-button"
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
                    setActivePage={goToPage}
                    refresh={loadNotifications}
                />

                {!loading && !loadError && activePage === "application" && (
                    <>
                        <header className="fdb-header">
                            <div>
                                <span className="fdb-eyebrow">Foster Status</span>
                                <h2>{banner.title}</h2>
                                <p>{banner.text}</p>
                            </div>

                            <div className="fdb-side">
                                <span className={`fdb-status is-${applicationStatus}`}>
                                    Application: {STATUS_LABEL[applicationStatus] || applicationStatus}
                                </span>

                                {(applicationStatus === "pending" || applicationStatus === "approved") && !confirmRevoke && (
                                    <button
                                        type="button"
                                        className="fdb-revoke"
                                        onClick={() => {
                                            setRevokeError("");
                                            setConfirmRevoke(true);
                                        }}
                                    >
                                        Revoke application
                                    </button>
                                )}

                                {(applicationStatus === "none" || applicationStatus === "rejected" || applicationStatus === "withdrawn") && (
                                    <button
                                        type="button"
                                        className="fdb-action"
                                        onClick={() => goToPage("application")}
                                    >
                                        {applicationStatus === "none" ? "Start application →" : "Apply again →"}
                                    </button>
                                )}
                            </div>
                        </header>

                        {confirmRevoke && (
                            <div className="fdb-revoke-confirm" role="alertdialog" aria-label="Revoke application">
                                <div>
                                    <b>Revoke your foster application?</b>
                                    <p>
                                        {applicationStatus === "approved"
                                            ? "You will stop being a foster and your account goes back to adopter. You will be logged out. You can't revoke while an animal is still in your care."
                                            : "Your application will be cancelled and staff will no longer review it. You can apply again later."}
                                    </p>
                                    {revokeError && <small className="fdb-revoke-error">{revokeError}</small>}
                                </div>

                                <div className="fdb-revoke-actions">
                                    <button
                                        type="button"
                                        className="fdb-action"
                                        onClick={() => setConfirmRevoke(false)}
                                        disabled={revoking}
                                    >
                                        Keep it
                                    </button>
                                    <button
                                        type="button"
                                        className="fdb-revoke is-confirm"
                                        onClick={revokeApplication}
                                        disabled={revoking}
                                    >
                                        {revoking ? "Revoking..." : "Yes, revoke"}
                                    </button>
                                </div>
                            </div>
                        )}

                        <nav className="fdb-tracker" aria-label="Foster application progress">
                            <ol>
                                {FOSTER_STEPS.map((label, index) => (
                                    <li
                                        key={label}
                                        className={
                                            applicationSubmitted
                                                ? "is-done"
                                                : index === 0
                                                    ? "is-current"
                                                    : ""
                                        }
                                    >
                                        <button type="button" onClick={() => goToPage("application")}>
                                            <b>{applicationSubmitted ? "✓" : index + 1}</b>
                                            {label}
                                        </button>
                                    </li>
                                ))}
                            </ol>

                            <span className={`fdb-tracker-pill ${applicationSubmitted ? "is-ready" : ""}`}>
                                {applicationSubmitted
                                    ? "Submitted"
                                    : `Step 1 of ${FOSTER_STEPS.length}`}
                            </span>
                        </nav>
                    </>
                )}

                {message && (

                    <div className="foster-message">

                        {message}

                    </div>

                )}

                {loading ? (

                    <section className="ao-loading" aria-busy="true">
                        <div className="ao-skeleton ao-skeleton-strip" />
                        <div className="ao-loading-grid">
                            <div className="ao-skeleton ao-skeleton-card" />
                            <div className="ao-skeleton ao-skeleton-card" />
                        </div>
                        <div className="ao-loading-note">
                            <span className="ao-spinner" />
                            Loading your foster dashboard...
                        </div>
                    </section>

                ) : loadError ? (

                    <section className="ao-state-error">
                        <div className="ao-state-error-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 9v4M12 17h.01" />
                                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                            </svg>
                        </div>
                        <h2>We couldn't load your foster details</h2>
                        <p>The server didn't respond. Check your connection and try again.</p>
                        <button type="button" onClick={loadDashboard}>
                            Try again
                        </button>
                    </section>

                ) : (

                    pages[activePage]

                )}

            </section>

            {pendingLeave && (
                <div
                    className="ao-confirm-backdrop"
                    onClick={() => setPendingLeave(null)}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") setPendingLeave(null);
                    }}
                >
                    <div
                        className="ao-confirm danger"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="foster-leave-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 id="foster-leave-title">Leave this form?</h3>
                        <p>
                            You have changes that haven't been submitted. If you
                            leave now, they won't be saved.
                        </p>
                        <div className="ao-confirm-actions">
                            <button type="button" autoFocus onClick={() => setPendingLeave(null)}>
                                Keep editing
                            </button>
                            <button type="button" className="ao-confirm-ok" onClick={confirmLeave}>
                                Leave form
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>

    );

}