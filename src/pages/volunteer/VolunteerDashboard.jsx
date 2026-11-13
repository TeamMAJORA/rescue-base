import {
    useEffect,
    useState
} from "react";

//CSS
import "../../styles/admin/StaffDashboard.css";
import "../../styles/admin/AdminDashboardOverview.css"
import "../../styles/admin/AnimalProfiles.css";
import "../../styles/admin/IntakeRecords.css";
import "../../styles/admin/LostFound.css";
import "../../styles/admin/Reports.css"; // activity log table (al2-*)
import "../../styles/admin/GISMapping.css"; // GIS Mapping page (same map as admin/staff)

// Assets
import assets from "../../data/assets.json";

// Modules
import RescueAssignments, { VolunteerOverview } from "./modules/RescueAssignments";

// // ANIMALS
import AnimalProfiles from "../admin/modules/animals/AnimalProfiles";
import IntakeRecords from "../admin/modules/animals/IntakeRecords";
import QRTags from "../admin/modules/animals/QRTags";
import ActivityLog from "./modules/ActivityLog";
import FeedbackForm from "../FeedbackForm";
import GISMapping from "../admin/modules/GISMapping";

// // ADOPTIONS
import AnimalTransfers from "../admin/modules/animals/AnimalTransfers";

import { markAllNotificationsRead } from "../../utils/savedNotifications";
import { openOnAdopterDashboard } from "../../utils/adopterStartPage";
import NotificationPanel from "../../components/notifications/NotificationPanel";
import SidebarUserCard from "../../components/system/SidebarUserCard";

// Sidebar icons (only the shape is used; the colour comes from CSS)
const ICONS = {
    overview: "/icons/sidebar/dashboard-brown.svg",
    rescues: "/icons/Volunteer.svg",
    animals: "/icons/sidebar/brown paw.svg",
    gis: "/icons/strayMap-brown.svg",
    "adopter-dashboard": "/icons/sidebar/return-brown.svg",
    "activity-log": "/icons/sidebar/history.svg",
    feedback: "/icons/sidebar/Feedback-brown.svg",
};

const staffMenu = [
    { key: "overview", label: "Dashboard" },
    { key: "rescues", label: "My Rescues" },

    {
        key: "animals",
        label: "Animals",
        children: [
            { key: "animal-profiles", label: "Animal Profiles" }//removed the qr they cant access it
        ],
    },

   //removed bcs of the new animal intake form
    {
        key: "gis",
        label: "GIS Mapping"
    },
    {
        key: "activity-log",
        label: "Activity Log",
    },
    {
        key: "feedback",
        label: "Feedback",
    },
];

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

export default function VolunteerDashboard({ setPage }) {
    const [activeStaffPage, setActiveStaffPage] = useState("overview");
    // Phones: the sidebar slides in from the menu button and closes once a page is picked
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [activeStaffPage]);
    const [openSidebarMenu, setOpenSidebarMenu] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // ---- Shared states: signed out (confirm popup + toasts live in AppDialogs) ----
    const savedRole = (() => {
        try {
            return String(
                JSON.parse(localStorage.getItem("rescuebase_user") || "{}").role || ""
            ).trim().toLowerCase();
        } catch {
            return "";
        }
    })();
    const isWrongRole = savedRole !== "volunteer";
    const volunteerName = (() => {
        try {
            const user = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");
            return user.username || user.name || "Volunteer";
        } catch {
            return "Volunteer";
        }
    })();
    const [signedOut, setSignedOut] = useState(false);
    // Server is under maintenance for roles that are not allowed to log in (admins are let through by the server)
    const [maintenance, setMaintenance] = useState("");

    useEffect(() => {
        // Any API call that comes back 401 means the login ran out
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            const url = String(args[0]?.url || args[0] || "");

            if (response.status === 401 && API && url.startsWith(API)) {
                //deactivated accounts are marked by the server so we can show the right screen
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

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

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
        setIsMobileMenuOpen(false); // also when tapping the page already open
    }

    // Lost & Found, donating and adopting live on the Adopter dashboard
    function openAdopterPage(adopterPageKey) {
        openOnAdopterDashboard(adopterPageKey);
        setPage("dashboard");
    }

    async function loadNotifications() {
        const token = localStorage.getItem("token");

        if (!token) {
            console.error("No authentication token found.");
            return;
        }

        try {
            const response = await fetch(
                `${API}/api/notifications`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true",
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error(
                    data.message ||
                    "Failed to load notifications."
                );
                return;
            }

            const notificationList =
                data.notifications || [];

            setNotifications(notificationList);

            setUnreadCount(
                notificationList.filter(
                    (notification) =>
                        !notification.read
                ).length
            );
        } catch (error) {
            console.error(
                "Load volunteer notifications error:",
                error
            );
        }
    }

    async function handleMarkAllRead() {
        await markAllNotificationsRead().catch((error) =>
            console.error("Mark all notifications read error:", error)
        );

        await loadNotifications();
    }

    async function handleNotificationClick(notification) {
        const token = localStorage.getItem("token");

        try {
            if (!notification.read && token) {
                const response = await fetch(
                    `${API}/api/notifications/${notification._id}/read`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "ngrok-skip-browser-warning": "true",
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    console.error(
                        data.message ||
                        "Failed to mark notification as read."
                    );
                }
            }
        } catch (error) {
            console.error(
                "Mark volunteer notification as read error:",
                error
            );
        }

        await loadNotifications();

        switch (notification.type) {
            case "rescue_update":
                setActiveStaffPage("rescues");
                break;
            case "lost_found_update":
                openAdopterPage("lost-found");
                break;
            case "donation":
            case "donation_update":
                openAdopterPage("donation-history");
                break;
            case "application_update":
                openAdopterPage("application-status");
                break;
            case "adoption_update":
                openAdopterPage("browse-pets");
                break;
            default:
                setActiveStaffPage("overview");
                break;
        }

        setNotifOpen(false);
    }

    function renderStaffContent() {
        if (activeStaffPage === "overview") {
            return <VolunteerOverview onNavigate={setActiveStaffPage} onOpenAdopterPage={openAdopterPage} />;
        }

        if (activeStaffPage === "rescues") {
            return <RescueAssignments />;
        }

        if (activeStaffPage === "animals" || activeStaffPage === "animal-profiles") {
            return <AnimalProfiles />;
        }

        if (activeStaffPage === "intake-records") {
            return <IntakeRecords />;
        }

        if (activeStaffPage === "qr-tags") {
            return <QRTags />
        }
//removed bcs of the new animal intake form

        if (activeStaffPage === "activity-log") {
            return <ActivityLog />;
        }

        if (activeStaffPage === "feedback") {
            return <FeedbackForm />;
        }

        if (activeStaffPage === "gis") {
            return <GISMapping />
        }
    }

    useEffect(() => {
        if (isWrongRole || signedOut || maintenance) return;

        loadNotifications();
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
            {isMobileMenuOpen && (
                <div className="dash-menu-backdrop" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
            )}
            <aside
                className={`staff-sidebar is-volunteer${isMobileMenuOpen ? " is-open" : ""}`}
                onClick={(event) => {
                    if (event.target.closest(".staff-submenu button")) setIsMobileMenuOpen(false);
                }}
            >
                <button
                    type="button"
                    className="staff-logo"
                    onClick={() => handleSidebarClick({ key: "overview" })}
                >
                    <img src={assets.logo} alt="RescueBase logo" />
                    <span>
                        RescueBase
                        <small>Volunteer</small>
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

                    <div className="staff-menu-group">
                        <button
                            type="button"
                            title="Adopt a Pet"
                            onClick={() => setPage("dashboard")}
                        >
                            <div className="staff-menu-text">
                                <span
                                    className="staff-menu-icon"
                                    style={{ "--icon": `url("${ICONS["adopter-dashboard"]}")` }}
                                    aria-hidden="true"
                                />
                                <strong>Adopt a Pet</strong>
                            </div>
                        </button>
                    </div>
                </nav>

                <SidebarUserCard
                    cardClassName="staff-user-card"
                    onOpenAccount={() => openAdopterPage("settings")}
                    onConfirmLogout={() => signOut("home")}
                >
                    <span className="staff-user-avatar">
                        <img src="/icons/User-brown.svg" alt="" aria-hidden="true" />
                    </span>
                    <span className="staff-user-info">
                        <strong>{volunteerName}</strong>
                        <small>Volunteer</small>
                    </span>
                </SidebarUserCard>
            </aside>

            <section className="staff-main">
                <header className="staff-topbar">
                    <button
                        type="button"
                        className="dash-menu-btn"
                        aria-label="Open menu"
                        aria-expanded={isMobileMenuOpen}
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                            <path d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                    </button>
                    <h1>{getStaffPageTitle(activeStaffPage)}</h1>

                    <div className="staff-notification-wrap">
                        <button
                            className={`staff-notification-btn ${notifOpen ? "open" : ""}`}
                            type="button"
                            aria-label="Notifications"
                            title="Notifications"
                            onClick={() =>
                                setNotifOpen((current) => !current)
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
                                <span>{unreadCount}</span>
                            )}
                        </button>

                        {notifOpen && (
                            <NotificationPanel
                                items={notifications.map((notification) => ({ ...notification, id: notification._id }))}
                                unreadCount={unreadCount}
                                onItemClick={handleNotificationClick}
                                onMarkAllRead={handleMarkAllRead}
                            />
                        )}
                    </div>
                </header>
                {renderStaffContent()}
            </section>
        </main>
    );
}