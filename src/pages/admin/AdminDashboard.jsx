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
import GlobalSettings from "./modules/GlobalSettings";
import IntakeForecast from "./modules/IntakeForecast";

// ANIMALS
import AnimalProfiles from "./modules/animals/AnimalProfiles";
import MedicalRecords from "./modules/animals/MedicalRecords";
import VaccinationRecords from "./modules/animals/VaccinationRecords";
import BehaviorAssessment from "./modules/animals/BehaviorAssessment";
import IntakeRecords from "./modules/animals/IntakeRecords";
import QRTags from "./modules/animals/QRTags";
import ActivityLog from "./modules/ActivityLog";
import AccountSettings from "../AccountSettings";

// ADOPTIONS
import AdoptionApplications from "./modules/adoptions/AdoptionApplications";
import AnimalTransfers from "./modules/animals/AnimalTransfers";
import { SuppliesPage } from "./modules/FoodStorage";

// Sidebar icons (only the shape is used; the colour comes from CSS)
const ICONS = {
    overview: "/icons/sidebar/dashboard-brown.svg",
    users: "/icons/User-brown.svg",
    animals: "/icons/sidebar/brown paw.svg",
    adoptions: "/icons/heart-brown.svg",
    "adoption-applications": "/icons/heart-brown.svg",
    "foster-care": "/icons/home.svg",
    donations: "/icons/sidebar/donation-brown.svg",
    supplies: "/icons/sidebar/supplies-brown.svg",
    "lost-found": "/icons/sidebar/LostnFound-brown.svg",
    rescue: "/icons/Volunteer.svg",
    "gis-mapping": "/icons/strayMap-brown.svg",
    feedback: "/icons/sidebar/Feedback-brown.svg",
    analytics: "/icons/sidebar/Status.svg",
    "intake-forecast": "/icons/sidebar/forecast.svg",
    reports: "/icons/sidebar/clipboard-brown.svg",
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
            { key: "behavior-assessment", label: "Behavioral Assessment" },
            { key: "qr-tags", label: "QR Tags" },
        ],
    },

    { key: "adoption-applications", label: "Adoptions" },//removed bcs of the new animal intake form
    { key: "foster-care", label: "Foster Care" },
    { key: "donations", label: "Donations" },
    { key: "supplies", label: "Supplies" },
    { key: "lost-found", label: "Lost & Found" },
    { key: "rescue", label: "Rescue Assignments" },
    { key: "gis-mapping", label: "GIS Mapping" },
    { key: "feedback", label: "Feedback" },
    { key: "analytics", label: "Analytics" },
    { key: "intake-forecast", label: "AI Intake Forecast" },
    { key: "reports", label: "Reports" },
    { key: "global-settings", label: "Settings" }
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

// ---------- Sidebar "new updates" dots ----------
// A tab gets an orange dot when something new arrived after you last opened it.
// "Last opened" is remembered per account in this browser.
const DOT_SOURCES = [
    {
        tab: "adoption-applications",
        url: "/api/adoptions",
        key: "applications",
        // Also count an applicant re-uploading documents after a resubmission request
        extraTime: (item) =>
            item.documentRequest?.status === "resubmitted" ? item.documentRequest.resubmittedAt : null,
    },
    { tab: "animal-profiles", url: "/api/animals/intakes", key: "intakes" },
    { tab: "feedback", url: "/api/feedback", key: "feedback" },
    { tab: "lost-found", url: "/api/lost-found/reports", key: "reports" },
    { tab: "foster-care", url: "/api/foster/applications", key: "applications" },
    { tab: "donations", url: "/api/donations", key: "donations" },
];

function dotStorageKey() {
    try {
        const user = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");
        return `rescuebase_seen_tabs_${user.email || user._id || "me"}`;
    } catch {
        return "rescuebase_seen_tabs_me";
    }
}

function readSeen() {
    try {
        return JSON.parse(localStorage.getItem(dotStorageKey()) || "{}") || {};
    } catch {
        return {};
    }
}

function writeSeen(seen) {
    try {
        localStorage.setItem(dotStorageKey(), JSON.stringify(seen));
    } catch {
        // storage blocked: dots just won't be remembered
    }
}

function useSidebarDots(activePage) {
    const [latest, setLatest] = useState({});
    const [seen, setSeen] = useState(readSeen);

    // Check for new items now and every minute
    useEffect(() => {
        let alive = true;

        async function check() {
            const token = localStorage.getItem("token");
            if (!token) return;
            let myEmail = "";
            try {
                myEmail = String(JSON.parse(localStorage.getItem("rescuebase_user") || "{}").email || "").toLowerCase();
            } catch {
                myEmail = "";
            }

            const results = await Promise.allSettled(
                DOT_SOURCES.map((source) =>
                    fetch(`${API}${source.url}`, { headers: { Authorization: `Bearer ${token}` } })
                        .then((response) => (response.ok ? response.json() : {}))
                        .then((data) => {
                            const items = Array.isArray(data[source.key]) ? data[source.key] : [];
                            // Things you created yourself don't count as "new"
                            const times = items
                                .filter((item) => String(item.createdByEmail || "").toLowerCase() !== myEmail || !myEmail)
                                .flatMap((item) => [item.createdAt, source.extraTime?.(item)])
                                .filter(Boolean)
                                .map((date) => new Date(date).getTime())
                                .filter(Number.isFinite);
                            return [source.tab, times.length ? Math.max(...times) : 0];
                        })
                )
            );
            if (!alive) return;

            const next = {};
            results.forEach((result) => {
                if (result.status === "fulfilled") next[result.value[0]] = result.value[1];
            });
            setLatest(next);

            // First visit: start counting from now, so old items don't all light up
            setSeen((current) => {
                const filled = { ...current };
                let changed = false;
                DOT_SOURCES.forEach(({ tab }) => {
                    if (!filled[tab]) {
                        filled[tab] = Date.now();
                        changed = true;
                    }
                });
                if (changed) writeSeen(filled);
                return changed ? filled : current;
            });
        }

        check();
        const timer = setInterval(check, 60000);
        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, []);

    // Opening a tab marks it as seen
    useEffect(() => {
        if (!DOT_SOURCES.some((source) => source.tab === activePage)) return undefined;
        const timer = setTimeout(() => {
            setSeen((current) => {
                const next = { ...current, [activePage]: Date.now() };
                writeSeen(next);
                return next;
            });
        }, 0);
        return () => clearTimeout(timer);
    }, [activePage, latest]);

    return new Set(
        DOT_SOURCES
            .filter(({ tab }) => tab !== activePage && latest[tab] && seen[tab] && latest[tab] > seen[tab])
            .map(({ tab }) => tab)
    );
}

export default function AdminDashboard({ setPage }) {

    const [activeAdminPage, setActiveAdminPage] = useState("overview");
    // Which tab Settings opens on (the dashboard's "View log" opens Activity log)
    const [settingsTab, setSettingsTab] = useState("system");
    // Which tab Supplies opens on (dashboard food links open Food stock)
    const [suppliesTab, setSuppliesTab] = useState("food");

    function openAdminPage(page) {
        if (page === "global-settings") setSettingsTab("system");

        if (page === "food-storage" || page === "needed-supplies") {
            setSuppliesTab(page === "food-storage" ? "food" : "needed");
            setActiveAdminPage("supplies");
            return;
        }

        if (page === "activity-log") {
            setSettingsTab("activity-log");
            setActiveAdminPage("global-settings");
            return;
        }
        setActiveAdminPage(page);
    }
    const newDots = useSidebarDots(activeAdminPage);
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
        if (item.key === "global-settings") setSettingsTab("system");
        if (item.key === "supplies") setSuppliesTab("food");

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

            const [adoptionResponse, fosterResponse, fosterApplicationResponse] = await Promise.all([
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

                fetch(`${API}/api/foster/applications`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }),
            ]);

            const adoptionData = await adoptionResponse.json();
            const fosterData = await fosterResponse.json();
            const fosterApplicationData = await fosterApplicationResponse.json();

            const pendingFosterApplications = (fosterApplicationData.applications || []).filter(
                (application) => application.status === "pending"
            );

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
        
            if (pendingFosterApplications.length > 0) {
                newNotifications.push({
                    id: "pending-foster-applications",
                    title: "Pending Foster Applications",
                    message: `${pendingFosterApplications.length} foster application(s) waiting for review.`,
                    page: "foster-care",
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
            return <AdminOverview onNavigate={openAdminPage} />;
        }

        if (activeAdminPage === "users") {
            return <UserManagement />;
        }

        if (activeAdminPage === "animals" || activeAdminPage === "animal-profiles") {
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
        if (animalRecordTabs[activeAdminPage]) {
            return <AnimalProfiles key={activeAdminPage} initialTab={animalRecordTabs[activeAdminPage]} />;
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


        if (activeAdminPage === "supplies") {
            return <SuppliesPage key={suppliesTab} initialTab={suppliesTab} />;
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


        if (activeAdminPage === "global-settings") {
            return (
                <AccountSettings
                    key={settingsTab}
                    initialTab={settingsTab}
                    onProfileSaved={() => setUserVersion((n) => n + 1)}
                    onLogout={() => signOut("home")}
                    extraTabs={[
                        { key: "system", label: "System settings", content: <GlobalSettings /> },
                        { key: "activity-log", label: "Activity log", content: <ActivityLog /> },
                    ]}
                />
            );
        }
        
        if (activeAdminPage === "intake-forecast") {
            return <IntakeForecast />;
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
                                        {(newDots.has(item.key) || item.children?.some((child) => newDots.has(child.key))) && (
                                            <span className="sb-dot" title="New updates" aria-label="New updates" />
                                        )}
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
                                                {newDots.has(child.key) && (
                                                    <span className="sb-dot" title="New updates" aria-label="New updates" />
                                                )}
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
                        {sidebarUser.profileImage ? (
                            <img className="is-photo" src={sidebarUser.profileImage} alt="" />
                        ) : (
                            <img src="/icons/User-brown.svg" alt="" aria-hidden="true" />
                        )}
                    </span>
                    <span className="admin-user-info">
                        <strong>{sidebarUser.name || sidebarUser.username || "Admin User"}</strong>
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
                                    Pages won't load until you turn it off. System settings still works.
                                </span>
                                <button type="button" onClick={() => openAdminPage("global-settings")}>
                                    Open System settings
                                </button>
                            </div>
                        ) : (
                            <div className="gs-maint-banner" role="status">
                                <span className="gs-maint-dot" aria-hidden="true" />
                                <span className="gs-maint-text">
                                    <b>Maintenance mode is on</b>
                                    Users can't use RescueBase right now. Only admins are signed in.
                                </span>
                                <button type="button" onClick={() => openAdminPage("global-settings")}>
                                    Turn off in System settings
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