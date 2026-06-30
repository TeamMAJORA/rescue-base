import {
    useEffect, useMemo, useState
} from "react";

//CSS
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminDashboardOverview.css"

// Assets
import assets from "../../data/assets.json";

// Modules
import AdminOverview from "./modules/AdminOverview";


const API = import.meta.env.VITE_BACKEND_URL;

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
    { key: "donation", label: "Donations" },
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

function ApplicationRow({ application, onReview, onUpdateStatus }) {
    return (
        <article className="admin-application-row">
            <div>
                <h3> {application.fullName || "Unknown Applicant"} </h3>
                <p> {application.email} </p>
                <p>
                    Pet : <strong> {application.petName || "Not selected"} </strong>
                </p>
            </div>

            <span className={`admin-status-pill ${application.status}`}>
                {application.status}
            </span>

            <div className="admin-application-status">
                <button type="button" onClick={() => onReview(application)}>
                    Review
                </button>

                {application.status === "pending" && (
                    <>
                        <button
                            type="button"
                            className="approve"
                            onClick={() => onUpdateStatus(application._id, "approved")}
                        >
                            Approve
                        </button>

                        <button
                            type="button"
                            className="reject"
                            onClick={() => onUpdateStatus(application._id, "rejected")}
                        >
                            Reject
                        </button>
                    </>
                )}
            </div>
        </article>
    );
}

function ApplicationModal({ application, onClose }) {
    if (!application) return null;

    return (
        <div className="admin-modal-overlay">
            <section className="admin-modal">
                <button className="admin-modal-class" type="button" onClick={onClose}>
                    x
                </button>

                <h2>Application Details</h2>

                <div className="admin-detail-grid">
                    <p><strong>Status:</strong> {application.status}</p>
                    <p><strong>Name:</strong> {application.fullName}</p>
                    <p><strong>Email:</strong> {application.email}</p>
                    <p><strong>Phone:</strong> {application.phone}</p>
                    <p><strong>Address:</strong> {application.address}</p>
                    <p><strong>Pet Name:</strong> {application.petName || "Not selected"}</p>
                    <p><strong>Pet Breed:</strong> {application.petBreed || "N/A"}</p>
                    <p><strong>Home Type:</strong> {application.homeType}</p>
                    <p><strong>Has Children:</strong> {application.hasChildren}</p>
                    <p><strong>Other Pets:</strong> {application.hasOtherPets}</p>
                </div>

                <div className="admin-detail-box">
                    <h3>Reason for Adtoption</h3>
                    <p> {application.reason || "No reason provided."} </p>
                </div>

                <div className="admin-detail-box">
                    <h3>Pet Care Experience</h3>
                    <p> {application.experience || "No experience provided."} </p>
                </div>

            </section>
        </div>
    );
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

    const [applications, setApplications] = useState([]);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ledgerEntries, setLedgersEntries] = useState([]);
    const [fosterMessage, setFosterMessage] = useState("");
    const [activeAdminPage, setActiveAdminPage] = useState("overview");
    const [openSidebarMenu, setOpenSidebarMenu] = useState(null);

    const pendingApplications = useMemo(() => {
        return applications.filter(
            (app) => String(app.status).toLowerCase() === "pending"
        );
    }, [applications]);

    const totalAnimals = mockAnimals.length;
    const availableAnimals = mockAnimals.filter(
        (animal) => animal.status === "available"
    ).length

    async function fetchApplications() {
        try {
            setLoading(true);

            const response = await fetch(`${API}/api/adoptions`);
            const data = await response.json();

            console.log("Admin applications:", data);

            if (!response.ok || !data.success) {
                setApplications([]);
                return;
            }

            setApplications(Array.isArray(data.applications) ? data.applications : []);
        } catch (error) {
            console.error("Fetch applications error:", error);
            setApplications([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateStatus(id, status) {
        try {
            const response = await fetch(
                `${API}/api/adoptions/${id}/status`,

                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ status }),
                }
            );

            const data = await response.json();
            console.log(data);

            if (data.success) {
                fetchApplications();
            }
        } catch (error) {
            console.log("Update status error:", error);
        }
    }

    async function fetchLedger() {
        try {
            const response = await fetch(`${API}/api/ledger?limit=8`);
            const data = await response.json();

            console.log("Ledger entries:", data);

            if (data.success) {
                setLedgersEntries(data.entries || []);
            }
        } catch (error) {
            console.error("Fetch ledger error:", error);
        }
    }

    async function handleCreateFosterAssignment(e) {
        e.preventDefault();

        try {
            setFosterMessage("");

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const response = await fetch(`${API}/api/foster/assignments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...fosterForm,
                    adminName: savedUser.name || savedUser.username || "Admin User",
                    adminEmail: savedUser.email || "admin",
                }),
            });

            const data = await response.json();
            console.log("Create foster assignment:", data);

            if (!response.ok || !data.success) {
                setFosterMessage(data.message || "Failed to create foster assignment.");
                return;
            }

            setFosterMessage("Foster assignment created.");

            setFosterForm({
                petName: "",
                petBreed: "",
                petImage: "",
                fosterName: "",
                fosterEmail: "",
                careInstructions: "",
            });

            fetchLedger();
        } catch (error) {
            console.error("Create foster assignment error:", error);
            setFosterMessage("Server error. Please try again.");
        }
    }

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
            return <AdminOverview />
        }
    }

    useEffect(() => {
        fetchApplications();
        fetchLedger();
    }, []);

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

                    <div className="admin-search">
                        <input placeholder="Search anything here..." />
                        <span>⌕</span>
                    </div>
                </header>

                    {renderAdminContent()}

            </section>

            <ApplicationModal
                application={selectedApplication}
                onClose={() => setSelectedApplication(null)}
            />
        </main>
    );
}