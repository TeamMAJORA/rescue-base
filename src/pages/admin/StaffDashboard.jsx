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

// Assets
import assets from "../../data/assets.json";

// Modules
import AdminOverview from "./modules/AdminOverview";
import FosterCare from "./modules/FosterCare";
import GISMapping from "./modules/GISMapping";
import UserManagement from "./modules/UserManagement";
import LostFound from "./modules/LostFound";
import Feedback from "./modules/Feedback";
import Analytics from "./modules/Analytics";
import Reports from "./modules/Reports";
import Donations from "./modules/Donations";

// // ANIMALS
import AnimalProfiles from "./modules/animals/AnimalProfiles";
import MedicalRecords from "./modules/animals/MedicalRecords";
import VaccinationRecords from "./modules/animals/VaccinationRecords";
import BehaviorAssessment from "./modules/animals/BehaviorAssessment";
import IntakeRecords from "./modules/animals/IntakeRecords";
import QRTags from "./modules/animals/QRTags";
import MobileFieldIntake from "./modules/animals/MobileFieldIntake";

// // ADOPTIONS
import AdoptionApplications from "./modules/adoptions/AdoptionApplications";
import MatchingQuizResults from "./modules/adoptions/MatchingQuizResults";
import Recommendations from "./modules/adoptions/Recommendations";
import AnimalTransfers from "./modules/animals/AnimalTransfers";

const staffMenu = [
    { key: "overview", label: "Dashboard" },

    {
        key: "animals",
        label: "Animals",
        children: [
            { key: "animal-profiles", label: "Animal Profiles" },
            { key: "medical-records", label: "Medical Records" },
            { key: "intake-records", label: "Intake Records" },
            { key: "vaccination-records", label: "Vaccination Records" },
            { key: "behavior-assessment", label: "Behavioral Assessment"},
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
    },
    { key: "foster-care", label: "Foster Care" },
    { key: "donations", label: "Donations" },
    { key: "lost-found", label: "Lost & Found" },
    { key: "gis-mapping", label: "GIS Mapping" },
    { key: "feedback", label: "Feedback" },
]

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

    const [fosterForm, setFosterForm] = useState({
        petName: "",
        petBreed: "",
        petImage: "",
        fosterName: "",
        fosterEmail: "",
        careInstructions: "",
    });

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

        if (activeStaffPage === "medical-records") {
            return <MedicalRecords />;
        }

        if (activeStaffPage === "intake-records") {
            return <IntakeRecords />;
        }

        if (activeStaffPage === "adoptions" || activeStaffPage === "adoption-applications") {
            return <AdoptionApplications />;
        }

        if (activeStaffPage === "matching-quiz") {
            return <MatchingQuizResults />;
        }

        if (activeStaffPage === "recommendations") {
            return <Recommendations />
        }

        if (activeStaffPage === "foster-care") {
            return <FosterCare />
        }

        if (activeStaffPage === "lost-found") {
            return <LostFound />
        }

        if (activeStaffPage === "gis-mapping") {
            return <GISMapping />;
        }

        if (activeStaffPage === "feedback") {
            return <Feedback />;
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

        if (activeStaffPage === "mobile-intake") {
            return <MobileFieldIntake />
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