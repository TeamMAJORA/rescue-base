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

export default function StaffDashboard({ setPage }) {
    const [activeStaffPage, setActiveStaffPage] = useState("overview");
    const [openSidebarMenu, setOpenSidebarMenu] = useState(null);
    const [notifications, setNotification] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);


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

    async function fetchStaffNotifications() {
        try {
            const [adoptionResponse, fosterResponse] = await Promise.all([
                fetch(`${API}/api/adoptions`),
                fetch(`${API}/api/foster/assignments`),
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
                    message: `${activeFosters.length} foster assignment(s) completed.`,
                });
            }

            setNotification(newNotifications);
        } catch (error) {
            console.error("Fetch staff notification error: ", error);
        }
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

    }

    useEffect(() => {
        fetchStaffNotifications();

        const interval = setInterval(() => {
            fetchStaffNotifications();
        }, 5000);

        return () => clearInterval(interval);
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
                            onClick={() => setNotifOpen(!notifOpen)}
                        >
                            BELL DAW NI

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
        </main>
    );
}