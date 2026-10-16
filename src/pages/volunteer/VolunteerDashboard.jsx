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

// Assets
import assets from "../../data/assets.json";

// Modules
import AdminOverview from "../admin/modules/AdminOverview";
import LostFound from "../admin/modules/LostFound";

// // ANIMALS
import AnimalProfiles from "../admin/modules/animals/AnimalProfiles";
import IntakeRecords from "../admin/modules/animals/IntakeRecords";
import QRTags from "../admin/modules/animals/QRTags";
import ActivityLog from "./modules/ActivityLog";
import FeedbackForm from "../FeedbackForm";
import GISMapping from "../admin/modules/GISMapping";

// // ADOPTIONS
import AnimalTransfers from "../admin/modules/animals/AnimalTransfers";

const staffMenu = [
    { key: "overview", label: "Dashboard" },

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
        key: "lost-found",
        label: "Lost & Found",
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

const mockAnimals = [
    { name: "Max", status: "available" },
    { name: "Blacky", status: "available" },
    { name: "Chichay", status: "available" },
    { name: "Milo", status: "available" },
    { name: "Luna", status: "available" },
    { name: "Coco", status: "available" },
    { name: "Buddy", status: "available" },
    { name: "Snow", status: "available" },
    { name: "Oreo", status: "not_available" },
    { name: "Ming", status: "not_available" },
];

function StaffStatCard({ label, value, icon }) {
    return (
        <article className="staff-stat-card">
            <div>
                <p>{label}</p>
                <h3>{value}</h3>
            </div>

            <span>{icon}</span>
        </article>
    );
}

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
    const [openSidebarMenu, setOpenSidebarMenu] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

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
    const [confirmBox, setConfirmBox] = useState(null);
    const [toasts, setToasts] = useState([]);

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
            setOpenSidebarMenu((current) =>
                current === item.key ? null : item.key
            );

            setActiveStaffPage(item.key);
            return;
        }

        setOpenSidebarMenu(null);
        setActiveStaffPage(item.key);
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

            default:
                setActiveStaffPage("overview");
                break;
        }

        setNotifOpen(false);
    }

    function renderStaffContent() {
        if (activeStaffPage === "overview") {
            return <AdminOverview />;
        }

        if (activeStaffPage === "animals" || activeStaffPage === "animal-profiles") {
            return <AnimalProfiles />;
        }

        if (activeStaffPage === "intake-records") {
            return <IntakeRecords />;
        }

        if (activeStaffPage === "lost-found") {
            return <LostFound />
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
            <aside className="staff-sidebar">
                <div className="staff-logo">
                    <img src={assets.logo} alt="RescueBase logo" />
                    <span>RescueBase</span>
                </div>

                <nav className="staff-menu">
                    {staffMenu.map((item) => {
                        const isOpen = openSidebarMenu === item.key;
                        const isActive =
                            activeStaffPage === item.key ||
                            item.children?.some((child) => child.key === activeStaffPage);

                        return (
                            <div className="staff-menu-group" key={item.key}>
                                <button
                                    type="button"
                                    title={item.label}
                                    className={isActive ? "active" : ""}
                                    onClick={() => handleSidebarClick(item)}
                                >
                                    <div className="staff-menu-text">
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
                    onClick={() => signOut("home")}
                >
                    <span>👤</span>
                    <div>
                        <strong>{volunteerName}</strong>
                        <small>Volunteer</small>
                    </div>
                    <span>→</span>
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
                            <div className="staff-notification-dropdown">
                                <div className="staff-notification-header">
                                    <strong>
                                        Notifications
                                    </strong>

                                    <small>
                                        {unreadCount} unread
                                    </small>
                                </div>

                                {notifications.length === 0 ? (
                                    <p className="staff-notifications-empty">
                                        No notifications.
                                    </p>
                                ) : (
                                    notifications.map(
                                        (notification) => (
                                            <button
                                                key={notification._id}
                                                type="button"
                                                className={`staff-notification-item ${notification.read
                                                        ? ""
                                                        : "unread"
                                                    }`}
                                                onClick={() =>
                                                    handleNotificationClick(
                                                        notification
                                                    )
                                                }
                                            >
                                                <strong>
                                                    {notification.title}
                                                </strong>

                                                <span>
                                                    {notification.message}
                                                </span>

                                                <small>
                                                    {new Date(
                                                        notification.createdAt
                                                    ).toLocaleString()}
                                                </small>
                                            </button>
                                        )
                                    )
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