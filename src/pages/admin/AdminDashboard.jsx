import {
    useState
} from "react";

//CSS
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminDashboardOverview.css"
import "../../styles/admin/AnimalProfiles.css";
import "../../styles/admin/MedicalRecords.css"
import "../../styles/admin/IntakeRecords.css"
import "../../styles/admin/AdoptionApplications.css"
import "../../styles/admin/MatchingQuizResults.css"
import "../../styles/admin/Recommendations.css"

// Assets
import assets from "../../data/assets.json";

// Modules
import AdminOverview from "./modules/AdminOverview";
import AnimalProfiles from "./modules/animals/AnimalProfiles";
import MedicalRecords from "./modules/animals/MedicalRecords";
import IntakeRecords from "./modules/animals/IntakeRecords";
import AdoptionApplications from "./modules/adoptions/AdoptionApplications";
import MatchingQuizResults from "./modules/adoptions/MatchingQuizResults";
import Recommendations from "./modules/adoptions/Recommendations";

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
    { key: "analytics", label: "Analytics" },
    { key: "notifications", label: "Notifications" },
    { key: "reports", label: "Reports" },
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

function AdminStatCard({ label, value, icon }) {
    return (
        <article className="admin-stat-card">
            <div>
                <p>{label}</p>
                <h3>{value}</h3>
            </div>

            <span>{icon}</span>
        </article>
    )
}


function getAdminPageTitle(activeAdminPage) {
    for ( const item of adminMenu) {
        if (item.key === activeAdminPage) return item.label;

        if (item.children) {
            const child = item.children.find(
                (child) => child.key === activeAdminPage
            );

            if(child) return child.label;
        }
    }
    return "Dashboard"
}

export default function AdminDashboard({ setPage }) {

    const [fosterForm, setFosterForm] = useState({
        petName: "",
        petBreed: "",
        petImage: "",
        fosterName: "",
        fosterEmail: "",
        careInstructions: "",
    });

    const [activeAdminPage, setActiveAdminPage] = useState("overview");
    const [openSidebarMenu, setOpenSidebarMenu] = useState(null);


    function handleSidebarClick(item) {
        if (item.children) {
            setOpenSidebarMenu((current) =>
                current === item.key ? null : item.key
            );

            setActiveAdminPage(item.key);
            return;
        }

        setOpenSidebarMenu(null);
        setActiveAdminPage(item.key);
    }

    function renderAdminContent() {
        if (activeAdminPage === "overview") {
            return <AdminOverview />;
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

    }

    return (
        <main className="admin-page">
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <img src={assets.logo} alt="RescueBase logo" />
                    <span>RescueBase</span>
                </div>

                <nav className="admin-menu">
                    {adminMenu.map((item) => {
                        const isOpen = openSidebarMenu === item.key;
                        const isActive =
                            activeAdminPage === item.key ||
                            item.children?.some((child) => child.key === activeAdminPage);

                        return (
                            <div className="admin-menu-group" key={item.key}>
                                <button
                                    type="button"
                                    title={item.label}
                                    className={isActive ? "active" : ""}
                                    onClick={() => handleSidebarClick(item)}
                                >
                                    <div className="admin-menu-text">
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
                    onClick={() => setPage("home")}
                >
                    <span>👤</span>
                    <div>
                        <strong>Admin User</strong>
                        <small>Admin</small>
                    </div>
                    <span>→</span>
                </button>
            </aside>

            <section className="admin-main">
                <header className="admin-topbar">
                    <h1>{getAdminPageTitle(activeAdminPage)}</h1>
                </header>
                    {renderAdminContent()}
            </section>
        </main>
    );
}