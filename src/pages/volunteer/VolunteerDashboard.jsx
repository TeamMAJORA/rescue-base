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
import MobileFieldIntake from "../admin/modules/animals/MobileFieldIntake";
import RescueAssignments from "./modules/RescueAssignments";
import RescueHistory from "./modules/RescueHistory";
import ActivityLog from "./modules/ActivityLog";
import FeedbackForm from "../FeedbackForm";

// // ADOPTIONS
import AnimalTransfers from "../admin/modules/animals/AnimalTransfers";

const staffMenu = [
    { key: "overview", label: "Dashboard" },

    {
        key: "animals",
        label: "Animals",
        children: [
            { key: "animal-profiles", label: "Animal Profiles" },
            { key: "qr-tags", label: "QR Tags" },
        ],
    },

    {
        key: "rescues",
        label: "Rescue Operations",
        children: [
            { key: "mobile-intake", label: "Mobile Field Intake" },
            { key: "rescue-assignments", label: "Rescue Assignments" },
            { key: "rescue-history", label: "My Rescue History" },
        ],
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
            case "rescue_update":
                setActiveStaffPage(
                    "rescue-assignments"
                );
                break;

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


        if (activeStaffPage === "mobile-intake") {
            return <MobileFieldIntake />
        }

        if (activeStaffPage === "rescue-assignments") {
            return <RescueAssignments />;
        }

        if (activeStaffPage === "rescue-history") {
            return <RescueHistory />;
        }

        if (activeStaffPage === "activity-log") {
            return <ActivityLog />;
        }

        if (activeStaffPage === "feedback") {
            return <FeedbackForm />;
        }
    }

    useEffect(() => {
        loadNotifications();
    }, []);

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
                    onClick={() => setPage("home")}
                >
                    <span>👤</span>
                    <div>
                        <strong>Staff User</strong>
                        <small>Staff</small>
                    </div>
                    <span>→</span>
                </button>
            </aside>

            <section className="staff-main">
                <header className="staff-topbar">
                    <h1>{getStaffPageTitle(activeStaffPage)}</h1>

                    <div className="staff-notification-wrap">
                        <button
                            className="staff-notification-btn"
                            type="button"
                            onClick={() =>
                                setNotifOpen((current) => !current)
                            }
                        >
                            BELL DAW NI

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
        </main>
    );
}