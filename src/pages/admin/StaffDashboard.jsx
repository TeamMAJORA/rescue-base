import {
    useEffect,
    useState
} from "react";

//CSS
import "../../styles/admin/StaffDashboard.css";
import "../../styles/admin/AdminDashboardOverview.css"
import "../../styles/admin/AnimalProfiles.css";
import "../../styles/admin/MedicalRecords.css";
import "../../styles/admin/IntakeRecords.css";
import "../../styles/admin/AdoptionApplications.css";
import "../../styles/admin/FosterCare.css";
import "../../styles/admin/LostFound.css";
import "../../styles/admin/GISMapping.css";
import "../../styles/admin/Feedback.css";
import "../../styles/admin/Analytics.css";
import "../../styles/admin/Reports.css";
import "../../styles/foster/UserManagement.css";
import "../../styles/admin/Donations.css";

// Assets
import assets from "../../data/assets.json";

// Modules
import AdminOverview from "./modules/AdminOverview";
import FosterCare from "./modules/FosterCare";
import GISMapping from "./modules/GISMapping";
import Rescue from "./modules/Rescue";
import LostFound from "./modules/LostFound";
import Feedback from "./modules/Feedback";
import Analytics from "./modules/Analytics";
import IntakeForecast from "./modules/IntakeForecast";
import Reports from "./modules/Reports";
import Donations from "./modules/Donations";

// // ANIMALS
import AnimalProfiles from "./modules/animals/AnimalProfiles";
import MedicalRecords from "./modules/animals/MedicalRecords";
import VaccinationRecords from "./modules/animals/VaccinationRecords";
import BehaviorAssessment from "./modules/animals/BehaviorAssessment";
import IntakeRecords from "./modules/animals/IntakeRecords";
import QRTags from "./modules/animals/QRTags";

// // ADOPTIONS
import AdoptionApplications from "./modules/adoptions/AdoptionApplications";
import AnimalTransfers from "./modules/animals/AnimalTransfers";
import AccountSettings from "../AccountSettings";

// Sidebar icons (only the shape is used; the colour comes from CSS)
const ICONS = {
    overview: "/icons/sidebar/dashboard-brown.svg",
    animals: "/icons/sidebar/brown paw.svg",
    adoptions: "/icons/heart-brown.svg",
    "adoption-applications": "/icons/heart-brown.svg",
    "foster-care": "/icons/home.svg",
    donations: "/icons/sidebar/donation-brown.svg",
    "lost-found": "/icons/sidebar/LostnFound-brown.svg",
    rescue: "/icons/Volunteer.svg",
    "gis-mapping": "/icons/strayMap-brown.svg",
    feedback: "/icons/sidebar/Feedback-brown.svg",
    analytics: "/icons/sidebar/Status.svg",
    "intake-forecast": "/icons/sidebar/forecast.svg",
    reports: "/icons/sidebar/clipboard-brown.svg",
    settings: "/icons/sidebar/settings-brown.svg",
};

const staffMenu = [
    { key: "overview", label: "Dashboard" },

    {
        key: "animals",
        label: "Animals",
        children: [
            { key: "animal-profiles", label: "Animal Profiles" },
            { key: "behavior-assessment", label: "Behavioral Assessment" },
            { key: "qr-tags", label: "QR Tags" },
        ],
    },

    { key: "adoption-applications", label: "Adoptions" },
    { key: "foster-care", label: "Foster Care" },
    { key: "donations", label: "Donations" },
    { key: "lost-found", label: "Lost & Found" },
    { key: "rescue", label: "Rescue Assignments" },
    { key: "gis-mapping", label: "GIS Mapping" },
    { key: "feedback", label: "Feedback" },
    { key: "analytics", label: "Analytics" },
    { key: "intake-forecast", label: "AI Intake Forecast" },
    { key: "reports", label: "Reports" },
    { key: "settings", label: "Settings" },
]

//removed the mock data
// mock data for staff statistics


function getStaffPageTitle(activeStaffPage) {
    for (const item of staffMenu) {
        if (item.key === activeStaffPage) return item.label;

        if (item.children) {
            const child = item.children.find(
                (child) => child.key === activeStaffPage
            );

            if (child) return child.label;
        }
    }
    return "Dashboard"
}

const API = import.meta.env.VITE_BACKEND_URL;

export default function StaffDashboard({ setPage }) {

    const [activeStaffPage, setActiveStaffPage] = useState("overview");
    const [openSidebarMenu, setOpenSidebarMenu] = useState(null);
    const [notifications, setNotification] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);
    const token = localStorage.getItem("token");



    // ---- Shared states: signed out, confirm popup, toasts ----
    const savedRole = (() => {
        try {
            return String(
                JSON.parse(localStorage.getItem("rescuebase_user") || "{}").role || ""
            ).trim().toLowerCase();
        } catch {
            return "";
        }
    })();
    const isWrongRole = savedRole !== "staff";
    const [signedOut, setSignedOut] = useState(false);
    // Server is under maintenance for roles that are not allowed to log in (admins are let through by the server)
    const [maintenance, setMaintenance] = useState("");
    const [confirmBox, setConfirmBox] = useState(null);
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        // 401 for all API calls: sign out the user and show the signed out screen
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            const url = String(args[0]?.url || args[0] || "");

            if (response.status === 401 && API && url.startsWith(API)) {
                // marks the user as signed out, but does not clear the token or localStorage yet (so that the signed out screen can show a message)
                let disabled = false;
                try {
                    disabled = Boolean((await response.clone().json())?.accountDisabled);
                } catch {
                    // not a JSON answer
                }
                setSignedOut((current) => (current === "disabled" || disabled ? "disabled" : true));
            }
            // 503 + maintenance flag: show the maintenance screen (admins are let through by the server)
            if (response.status === 503 && API && url.startsWith(API)) {
                try {
                    const body = await response.clone().json();
                    if (body?.maintenance) {
                        setMaintenance(body.message || "RescueBase is under maintenance.");
                    }
                } catch {
                    // not a JSON answer
                }
            }

            return response;
        };

        // Modules call these instead of window.confirm / alert
        window.rbConfirm = (options) =>
            new Promise((resolve) => {
                setConfirmBox({ ...options, resolve });
            });

        window.rbToast = (text, tone = "success") => {
            const id = `${Date.now()}-${Math.random()}`;
            setToasts((current) => [...current, { id, text, tone }]);
            setTimeout(() => {
                setToasts((current) => current.filter((toast) => toast.id !== id));
            }, 3200);
        };

        return () => {
            window.fetch = originalFetch;
            delete window.rbConfirm;
            delete window.rbToast;
        };
    }, []);

    function closeConfirm(answer) {
        confirmBox?.resolve(answer);
        setConfirmBox(null);
    }

    // Name + photo for the sidebar card (re-read after Settings saves)
    const [, setUserVersion] = useState(0);
    const sidebarUser = (() => {
        try {
            return JSON.parse(localStorage.getItem("rescuebase_user") || "{}") || {};
        } catch {
            return {};
        }
    })();

    function signOut(goTo) {
        localStorage.removeItem("token");
        localStorage.removeItem("rescuebase_user");
        setPage(goTo);
    }

    function handleSidebarClick(item) {
        if (item.children) {
            const isOpen = openSidebarMenu === item.key;

            // Clicking an open group just collapses it
            if (isOpen) {
                setOpenSidebarMenu(null);
                return;
            }

            setOpenSidebarMenu(item.key);

            // Stay on a sub-page of this group if already there; otherwise open its first page
            const alreadyInside = item.children.some(
                (child) => child.key === activeStaffPage
            );

            if (!alreadyInside) {
                setActiveStaffPage(item.children[0].key);
            }

            return;
        }

        setOpenSidebarMenu(null);
        setActiveStaffPage(item.key);
    }

    async function fetchStaffNotifications() {
        try {
            const [adoptionResponse, fosterResponse] = await Promise.all([
                fetch(`${API}/api/adoptions`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }),
                fetch(`${API}/api/foster/assignments`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }),
            ]);

            const adoptionData = await adoptionResponse.json();
            const fosterData = await fosterResponse.json();

            const adoptionApplications = adoptionData.applications || [];
            const fosterAssignments = fosterData.assignments || [];

            const pendingApplication = adoptionApplications.filter(
                (application) => application.status === "pending"
            );

            const activeFosters = fosterAssignments.filter(
                (assignment) => assignment.status === "active"
            );

            const completedFosters = fosterAssignments.filter(
                (assignment) => assignment.status === "completed"
            );

            const newNotifications = [];

            if (pendingApplication.length > 0) {
                newNotifications.push({
                    id: "pending-applications",
                    title: "Pending Adoption Applications",
                    message: `${pendingApplication.length} application(s) waiting for review.`,
                    page: "adoption-applications",
                });
            }

            if (activeFosters.length > 0) {
                newNotifications.push({
                    id: "active-fosters",
                    title: "Active foster assignment",
                    message: `${activeFosters.length} foster assignments(s) currently in progress.`,
                    page: "foster-care",
                });
            }

            if (completedFosters.length > 0) {
                newNotifications.push({
                    id: "completed-fosters",
                    title: "Completed Foster Assignment",
                    message: `${completedFosters.length} foster assignment(s) completed.`,
                    page: "foster-care",
                });
            }

            setNotification(newNotifications);
        } catch (error) {
            console.error("Fetch staff notification error: ", error);
        }
    }

    function renderStaffContent() {
        if (activeStaffPage === "overview") {
            return <AdminOverview onNavigate={setActiveStaffPage} />;
        }

        if (activeStaffPage === "animals" || activeStaffPage === "animal-profiles") {
            return <AnimalProfiles />;
        }

        // Old record pages now live as tabs inside Animal Profiles
        const animalRecordTabs = {
            "intake-records": "intake",
            "mobile-intake": "intake",
            "medical-records": "medical",
            "vaccination-records": "vaccinations",
            "animal-transfers": "transfers",
        };
        if (animalRecordTabs[activeStaffPage]) {
            return <AnimalProfiles key={activeStaffPage} initialTab={animalRecordTabs[activeStaffPage]} />;
        }

        if (activeStaffPage === "medical-records") {
            return <MedicalRecords />;
        }

        if (activeStaffPage === "intake-records") {
            return <IntakeRecords />;
        }

        if (activeStaffPage === "adoptions" || activeStaffPage === "adoption-applications") {
            return <AdoptionApplications />;
        }

        if (activeStaffPage === "foster-care") {
            return <FosterCare />
        }

        if (activeStaffPage === "lost-found") {
            return <LostFound />
        }

        if (activeStaffPage === "rescue") {
            return <Rescue />;
        }

        if (activeStaffPage === "gis-mapping") {
            return <GISMapping />;
        }

        if (activeStaffPage === "feedback") {
            return <Feedback />;
        }

        if (activeStaffPage === "analytics") {
            return <Analytics />;
        }

        if (activeStaffPage === "settings") {
            return <AccountSettings onLogout={() => signOut("home")} onProfileSaved={() => setUserVersion((n) => n + 1)} />;
        }

        if (activeStaffPage === "intake-forecast") {
            return <IntakeForecast />;
        }

        if (activeStaffPage === "reports") {
            return <Reports />;
        }

        if (activeStaffPage === "donations") {
            return <Donations />;
        }

        if (activeStaffPage === "vaccination-records") {
            return <VaccinationRecords />
        }

        if (activeStaffPage === "behavior-assessment") {
            return <BehaviorAssessment />
        }

        if (activeStaffPage === "qr-tags") {
            return <QRTags />
        }

        if (activeStaffPage === "animal-transfers") {
            return <AnimalTransfers />
        }


    }

    useEffect(() => {
        if (isWrongRole || signedOut || maintenance) return;

        // Loading data when the page opens is the normal use of an effect;
        // this newer lint rule flags it anyway, so it is switched off for this one line.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchStaffNotifications();

        const interval = setInterval(() => {
            fetchStaffNotifications();
        }, 5000);

        return () => clearInterval(interval);
    }, [signedOut, maintenance]);


    // Account was deactivated by an admin
    if (signedOut === "disabled") {
        return (
            <main className="ao-signed-out">
                <section className="ao-signed-out-card">
                    <div className="ao-signed-out-icon is-blocked">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M5.6 5.6l12.8 12.8" />
                        </svg>
                    </div>
                    <h2>Your account has been deactivated</h2>
                    <p>An admin turned off this account, so you've been signed out.</p>
                    <p className="ao-signed-out-note">
                        Think this is a mistake? Please contact the shelter staff.
                    </p>
                    <button type="button" onClick={() => signOut("home")}>
                        Back to home
                    </button>
                </section>
            </main>
        );
    }

    if (maintenance && !signedOut && !isWrongRole) {
        return (
            <main className="ao-signed-out">
                <section className="ao-signed-out-card">
                    <div className="ao-signed-out-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />
                        </svg>
                    </div>
                    <h2>We'll be right back</h2>
                    <p>{maintenance}</p>
                    <button type="button" onClick={() => window.location.reload()}>
                        Check again
                    </button>
                    <button type="button" className="ao-signed-out-link" onClick={() => signOut("home")}>
                        Log out
                    </button>
                </section>
            </main>
        );
    }

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

    return (
        <main className="staff-page">
            <aside className="staff-sidebar">
                <button
                    type="button"
                    className="staff-logo"
                    onClick={() => handleSidebarClick({ key: "overview" })}
                >
                    <img src={assets.logo} alt="RescueBase logo" />
                    <span>
                        RescueBase
                        <small>Staff</small>
                    </span>
                </button>

                <nav className="staff-menu">
                    {staffMenu.map((item) => {
                        const isOpen = openSidebarMenu === item.key;
                        const isActive =
                            activeStaffPage === item.key ||
                            item.children?.some((child) => child.key === activeStaffPage);
                        const icon = ICONS[item.key];

                        return (
                            <div className="staff-menu-group" key={item.key}>
                                <button
                                    type="button"
                                    title={item.label}
                                    className={isActive ? "active" : ""}
                                    onClick={() => handleSidebarClick(item)}
                                >
                                    <div className="staff-menu-text">
                                        <span
                                            className="staff-menu-icon"
                                            style={icon ? { "--icon": `url("${icon}")` } : undefined}
                                            aria-hidden="true"
                                        />
                                        <strong>{item.label}</strong>
                                    </div>

                                    {item.children && (
                                        <span className={`staff-menu-arrow ${isOpen ? "open" : ""}`}>
                                            ▾
                                        </span>
                                    )}
                                </button>

                                {item.children && isOpen && (
                                    <div className="staff-submenu">
                                        {item.children.map((child) => (
                                            <button
                                                key={child.key}
                                                type="button"
                                                title={child.label}
                                                className={
                                                    activeStaffPage === child.key ? "active" : ""
                                                }
                                                onClick={() => setActiveStaffPage(child.key)}
                                            >
                                                {child.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <button
                    className="staff-user-card"
                    type="button"
                    title="Log out"
                    onClick={() => signOut("home")}
                >
                    <span className="staff-user-avatar">
                        {sidebarUser.profileImage ? (
                            <img className="is-photo" src={sidebarUser.profileImage} alt="" />
                        ) : (
                            <img src="/icons/User-brown.svg" alt="" aria-hidden="true" />
                        )}
                    </span>
                    <span className="staff-user-info">
                        <strong>{sidebarUser.name || sidebarUser.username || "Staff User"}</strong>
                        <small>Staff · Log out</small>
                    </span>
                    <span className="staff-user-arrow" aria-hidden="true">→</span>
                </button>
            </aside>

            <section className="staff-main">
                <header className="staff-topbar">
                    <h1>{getStaffPageTitle(activeStaffPage)}</h1>

                    <div className="staff-notification-wrap">
                        <button
                            className={`staff-notification-btn ${notifOpen ? "open" : ""}`}
                            type="button"
                            aria-label="Notifications"
                            title="Notifications"
                            onClick={() => setNotifOpen(!notifOpen)}
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

                            {notifications.length > 0 && (
                                <span>{notifications.length}</span>
                            )}
                        </button>

                        {notifOpen && (
                            <div className="staff-notification-dropdown">
                                <div className="staff-notification-header">
                                    <strong>Notifications</strong>
                                    <small>{notifications.length} updates(s)</small>
                                </div>

                                {notifications.length === 0 ? (
                                    <p className="staff-notifications-empty">
                                        No new notifications.
                                    </p>
                                ) : (
                                    notifications.map((notification) => (
                                        <button
                                            key={notification.id}
                                            type="button"
                                            className="staff-notification-item"
                                            onClick={() => {
                                                setActiveStaffPage(notification.page);
                                                setNotifOpen(false);
                                            }}
                                        >
                                            <strong>{notification.title}</strong>
                                            <span>{notification.message}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </header>
                {renderStaffContent()}
            </section>
            {confirmBox && (
                <div
                    className="ao-confirm-backdrop"
                    onClick={() => closeConfirm(false)}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") closeConfirm(false);
                    }}
                >
                    <div
                        className={`ao-confirm${confirmBox.danger ? " danger" : ""}`}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ao-confirm-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 id="ao-confirm-title">{confirmBox.title}</h3>
                        {confirmBox.message && <p>{confirmBox.message}</p>}
                        <div className="ao-confirm-actions">
                            <button type="button" autoFocus onClick={() => closeConfirm(false)}>
                                {confirmBox.cancelLabel || "Cancel"}
                            </button>
                            <button
                                type="button"
                                className="ao-confirm-ok"
                                onClick={() => closeConfirm(true)}
                            >
                                {confirmBox.confirmLabel || "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="ao-toasts" aria-live="polite">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`ao-toast ${toast.tone}`}>
                        <i aria-hidden="true">{toast.tone === "error" ? "!" : "✓"}</i>
                        {toast.text}
                    </div>
                ))}
            </div>
        </main>
    );
}