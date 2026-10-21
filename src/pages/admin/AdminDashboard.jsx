import {
    useEffect,
    useState
} from "react";

//CSS
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AnimalProfiles.css";
import "../../styles/admin/MedicalRecords.css";
import "../../styles/admin/IntakeRecords.css";
import "../../styles/admin/AdoptionApplications.css";
import "../../styles/admin/MatchingQuizResults.css";
import "../../styles/admin/Recommendations.css";
import "../../styles/admin/FosterCare.css";
import "../../styles/admin/LostFound.css";
import "../../styles/admin/GISMapping.css";
import "../../styles/admin/Feedback.css";
import "../../styles/admin/Analytics.css";
import "../../styles/admin/Reports.css";
import "../../styles/foster/UserManagement.css";
import "../../styles/admin/Donations.css";
import "../../styles/admin/Behavior.css";
import "../../styles/admin/Vaccination.css";


// Assets
import assets from "../../data/assets.json";

// Modules
import AdminOverview from "./modules/AdminOverview";
import FosterCare from "./modules/FosterCare";
import GISMapping from "./modules/GISMapping";
import Rescue from "./modules/Rescue";
import UserManagement from "./modules/UserManagement";
import LostFound from "./modules/LostFound";
import Feedback from "./modules/Feedback";
import Analytics from "./modules/Analytics";
import Reports from "./modules/Reports";
import Donations from "./modules/Donations";
import NeededSupplies from "./modules/NeededSupplies";
import GlobalSettings from "./modules/GlobalSettings";

// ANIMALS
import AnimalProfiles from "./modules/animals/AnimalProfiles";
import MedicalRecords from "./modules/animals/MedicalRecords";
import VaccinationRecords from "./modules/animals/VaccinationRecords";
import BehaviorAssessment from "./modules/animals/BehaviorAssessment";
import IntakeRecords from "./modules/animals/IntakeRecords";
import QRTags from "./modules/animals/QRTags";
import MobileFieldIntake from "./modules/animals/MobileFieldIntake";
import ActivityLog from "./modules/ActivityLog";

// ADOPTIONS
import AdoptionApplications from "./modules/adoptions/AdoptionApplications";
import MatchingQuizResults from "./modules/adoptions/MatchingQuizResults";
import Recommendations from "./modules/adoptions/Recommendations";
import AnimalTransfers from "./modules/animals/AnimalTransfers";

// Sidebar icons (only the shape is used; the colour comes from CSS)
const ICONS = {
    overview: "/icons/sidebar/dashboard-brown.svg",
    users: "/icons/User-brown.svg",
    animals: "/icons/sidebar/brown paw.svg",
    adoptions: "/icons/heart-brown.svg",
    "foster-care": "/icons/home.svg",
    donations: "/icons/sidebar/donation-brown.svg",
    "needed-supplies": "/icons/sidebar/supplies-brown.svg", 
    "lost-found": "/icons/sidebar/LostnFound-brown.svg",
    rescue: "/icons/Volunteer.svg",
    "gis-mapping": "/icons/strayMap-brown.svg",
    feedback: "/icons/sidebar/Feedback-brown.svg",
    analytics: "/icons/sidebar/Status.svg",
    reports: "/icons/sidebar/clipboard-brown.svg",
    "activity-log": "/icons/sidebar/history.svg",
    "global-settings": "/icons/sidebar/settings-brown.svg",
};

const adminMenu = [
    { key: "overview", label: "Dashboard" },

    { key: "users", label: "User Management" },

    {
        key: "animals",
        label: "Animals",
        children: [
            { key: "animal-profiles", label: "Animal Profiles" },
            { key: "medical-records", label: "Medical Records" },
            { key: "intake-records", label: "Intake Records" },
            { key: "vaccination-records", label: "Vaccination Records" },
            { key: "behavior-assessment", label: "Behavioral Assessment" },
            { key: "qr-tags", label: "QR Tags" },
            { key: "animal-transfers", label: "Animal Transfers" },
            { key: "mobile-intake", label: "Mobile Field Intake" },
        ],
    },

    {
        key: "adoptions",
        label: "Adoptions",
        children: [
            { key: "adoption-applications", label: "Applications" },
            { key: "matching-quiz", label: "Matching Quiz Results" },
            { key: "recommendations", label: "Recommendations" },
        ],
    },//removed bcs of the new animal intake form
    { key: "foster-care", label: "Foster Care" },
    { key: "donations", label: "Donations" },
    { key: "needed-supplies", label: "Needed Supplies" },
    { key: "lost-found", label: "Lost & Found" },
    { key: "rescue", label: "Rescue Assignments" },
    { key: "gis-mapping", label: "GIS Mapping" },
    { key: "feedback", label: "Feedback" },
    { key: "analytics", label: "Analytics" },
    { key: "reports", label: "Reports" },
    { key: "activity-log", label: "Activity Log"},
    { key: "global-settings", label: "Global Settings"}
]


function getAdminPageTitle(activeAdminPage) {
    for (const item of adminMenu) {
        if (item.key === activeAdminPage) return item.label;

        if (item.children) {
            const child = item.children.find(
                (child) => child.key === activeAdminPage
            );

            if (child) return child.label;
        }
    }
    return "Dashboard"
}

const API = import.meta.env.VITE_BACKEND_URL;

export default function AdminDashboard({ setPage }) {

    const [activeAdminPage, setActiveAdminPage] = useState("overview");
    const [openSidebarMenu, setOpenSidebarMenu] = useState(null);
    const [notifications, setNotification] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);

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
    const isWrongRole = savedRole !== "admin";
    const [signedOut, setSignedOut] = useState(false);
    // Server is under maintenance to message the roles that are not allowed to log in
    const [maintenance, setMaintenance] = useState("");
    // Saved maintenance settings, for the banner (admins are never blocked by the full screen)
    const [maintenanceInfo, setMaintenanceInfo] = useState({ enabled: false, allowAdminAccess: true });

    useEffect(() => {
        if (isWrongRole) return;

        const token = localStorage.getItem("token");

        // /api/settings always works for admins, even during maintenance
        fetch(`${API}/api/settings`, { headers: { Authorization: `Bearer ${token}` } })
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
                if (data?.settings?.maintenance) setMaintenanceInfo(data.settings.maintenance);
            })
            .catch(() => {});

        //output the maintenance message if the server is under maintenance and the user is not an admin
        function handleSaved(event) {
            const next = event.detail?.maintenance;
            if (!next) return;

            setMaintenanceInfo(next);
            if (!next.enabled || next.allowAdminAccess) setMaintenance("");
        }

        window.addEventListener("rb-settings-saved", handleSaved);
        return () => window.removeEventListener("rb-settings-saved", handleSaved);
    }, []);
    const [confirmBox, setConfirmBox] = useState(null);
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        // 401 for all API calls: sign out the user and show the signed out screen
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            const url = String(args[0]?.url || args[0] || "");

            if (response.status === 401 && API && url.startsWith(API)) {
                // The server marks deactivated accounts so we can show the right screen
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
                (child) => child.key === activeAdminPage
            );

            if (!alreadyInside) {
                setActiveAdminPage(item.children[0].key);
            }

            return;
        }

        setOpenSidebarMenu(null);
        setActiveAdminPage(item.key);
    }

    async function fetchAdminNotifications() {
        try {
            const token = localStorage.getItem("token");

            if (!token) {
                console.error("No RescueBase auth token found");
                return;
            }

            const [adoptionResponse, fosterResponse] = await Promise.all([
                fetch(`${API}/api/adoptions`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }),

                fetch(`${API}/api/foster/assignments`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
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
                    id: "pending-applcations",
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
            console.error("Fetch admin notification error: ", error);
        }
    }

    function renderAdminContent() {
        if (activeAdminPage === "overview") {
            return <AdminOverview />;
        }

        if (activeAdminPage === "users") {
            return <UserManagement />;
        }

        if (activeAdminPage === "animals" || activeAdminPage === "animal-profiles") {
            return <AnimalProfiles />;
        }

        if (activeAdminPage === "medical-records") {
            return <MedicalRecords />;
        }

        if (activeAdminPage === "intake-records") {
            return <IntakeRecords />;
        }

        if (activeAdminPage === "adoptions" || activeAdminPage === "adoption-applications") {
            return <AdoptionApplications />;
        }

        if (activeAdminPage === "matching-quiz") {
            return <MatchingQuizResults />;
        }

        if (activeAdminPage === "recommendations") {
            return <Recommendations />
        }

        if (activeAdminPage === "foster-care") {
            return <FosterCare />
        }

        if (activeAdminPage === "lost-found") {
            return <LostFound />
        }

        if (activeAdminPage === "rescue") {
            return <Rescue />;
        }

        if (activeAdminPage === "gis-mapping") {
            return <GISMapping />;
        }

        if (activeAdminPage === "feedback") {
            return <Feedback />;
        }

        if (activeAdminPage === "analytics") {
            return <Analytics />;
        }

        if (activeAdminPage === "reports") {
            return <Reports />;
        }

        if (activeAdminPage === "donations") {
            return <Donations />;
        }

        if (activeAdminPage === "needed-supplies") {
            return <NeededSupplies />;
        }

        if (activeAdminPage === "vaccination-records") {
            return <VaccinationRecords />;
        }

        if (activeAdminPage === "behavior-assessment") {
            return <BehaviorAssessment />;
        }

        if (activeAdminPage === "qr-tags") {
            return <QRTags />;
        }

        if (activeAdminPage === "animal-transfers") {
            return <AnimalTransfers />;
        }

        if (activeAdminPage === "mobile-intake") {
            return <MobileFieldIntake />;
        }

        if (activeAdminPage === "activity-log") {
            return <ActivityLog />;
        }

        if (activeAdminPage === "global-settings") {
            return <GlobalSettings />;
        }

    }

    useEffect(() => {
        if (isWrongRole || signedOut || maintenance) return;

        // Loading data when the page opens is the normal use of an effect;
        // this newer lint rule flags it anyway, so it is switched off for this one line.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAdminNotifications();

        const interval = setInterval(() => {
            fetchAdminNotifications();
        }, 5000);

        return () => clearInterval(interval);
    }, [signedOut, maintenance]);


    // Admins never get the full maintenance screen (they must reach Global Settings);
    // a banner shows instead when "Let admins in" is off.

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
        <main className="admin-page">
            <aside className="admin-sidebar">
                <button
                    type="button"
                    className="admin-logo"
                    onClick={() => handleSidebarClick({ key: "overview" })}
                >
                    <img src={assets.logo} alt="RescueBase logo" />
                    <span>
                        RescueBase
                        <small>Admin</small>
                    </span>
                </button>

                <nav className="admin-menu">
                    {adminMenu.map((item) => {
                        const isOpen = openSidebarMenu === item.key;
                        const isActive =
                            activeAdminPage === item.key ||
                            item.children?.some((child) => child.key === activeAdminPage);
                        const icon = ICONS[item.key];

                        return (
                            <div className="admin-menu-group" key={item.key}>
                                <button
                                    type="button"
                                    title={item.label}
                                    className={isActive ? "active" : ""}
                                    onClick={() => handleSidebarClick(item)}
                                >
                                    <div className="admin-menu-text">
                                        <span
                                            className="admin-menu-icon"
                                            style={icon ? { "--icon": `url("${icon}")` } : undefined}
                                            aria-hidden="true"
                                        />
                                        <strong>{item.label}</strong>
                                    </div>

                                    {item.children && (
                                        <span className={`admin-menu-arrow ${isOpen ? "open" : ""}`}>
                                            ▾
                                        </span>
                                    )}
                                </button>

                                {item.children && isOpen && (
                                    <div className="admin-submenu">
                                        {item.children.map((child) => (
                                            <button
                                                key={child.key}
                                                type="button"
                                                title={child.label}
                                                className={
                                                    activeAdminPage === child.key ? "active" : ""
                                                }
                                                onClick={() => setActiveAdminPage(child.key)}
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
                    className="admin-user-card"
                    type="button"
                    title="Log out"
                    onClick={() => signOut("home")}
                >
                    <span className="admin-user-avatar">
                        <img src="/icons/User-brown.svg" alt="" aria-hidden="true" />
                    </span>
                    <span className="admin-user-info">
                        <strong>Admin User</strong>
                        <small>Admin · Log out</small>
                    </span>
                    <span className="admin-user-arrow" aria-hidden="true">→</span>
                </button>
            </aside>

            <section className="admin-main">
                <header className="admin-topbar">
                    <h1>{getAdminPageTitle(activeAdminPage)}</h1>

                    <div className="admin-notification-wrap">
                        <button
                            className={`admin-notification-btn ${notifOpen ? "open" : ""}`}
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
                            <div className="admin-notification-dropdown">
                                <div className="admin-notification-header">
                                    <strong>Notifications</strong>
                                    <small>{notifications.length} updates(s)</small>
                                </div>

                                {notifications.length === 0 ? (
                                    <p className="admin-notifications-empty">
                                        No new notifications.
                                    </p>
                                ) : (
                                    notifications.map((notification) => (
                                        <button
                                            key={notification.id}
                                            type="button"
                                            className="admin-notification-item"
                                            onClick={() => {
                                                setActiveAdminPage(notification.page);
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

                {activeAdminPage !== "global-settings" &&
                    (maintenance || maintenanceInfo.enabled) && (
                        maintenance || !maintenanceInfo.allowAdminAccess ? (
                            <div className="gs-maint-banner is-blocked" role="alert">
                                <span className="gs-maint-dot" aria-hidden="true" />
                                <span className="gs-maint-text">
                                    <b>Maintenance mode is on for everyone</b>
                                    Pages won't load until you turn it off. Global Settings still works.
                                </span>
                                <button type="button" onClick={() => setActiveAdminPage("global-settings")}>
                                    Open Global Settings
                                </button>
                            </div>
                        ) : (
                            <div className="gs-maint-banner" role="status">
                                <span className="gs-maint-dot" aria-hidden="true" />
                                <span className="gs-maint-text">
                                    <b>Maintenance mode is on</b>
                                    Users can't use RescueBase right now. Only admins are signed in.
                                </span>
                                <button type="button" onClick={() => setActiveAdminPage("global-settings")}>
                                    Turn off in Global Settings
                                </button>
                            </div>
                        )
                    )}
                {renderAdminContent()}
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