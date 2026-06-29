import {
    useEffect, useMemo, useState
} from "react";
import "../../styles/admin/AdminDashboard.css";
import assets from "../../data/assets.json";

const API = import.meta.env.VITE_BACKEND_URL;

const sidebarItems = [
    "Dashboard",
    "Animals",
    "Applications",
    "Foster Care",
    "Lost & Found",
    "Stray Map",
    "Donations",
    "Users",
    "Notifications",
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
                    {sidebarItems.map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={item === "Dashboard" ? "active" : ""}
                        >
                            <span>▣</span>
                            {item}
                        </button>
                    ))}
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
                    <h1>Dashboard</h1>

                    <div className="admin-search">
                        <input placeholder="Search anything here..." />
                        <span>⌕</span>
                    </div>
                </header>

                <section className="admin-stats">
                    <AdminStatCard label="Total Animals" value={totalAnimals} icon="🐾" />
                    <AdminStatCard
                        label="Animals Available for Adoption"
                        value={availableAnimals}
                        icon="🏠"
                    />
                    <AdminStatCard
                        label="Pending Adoption Applications"
                        value={pendingApplications.length}
                        icon="📋"
                    />
                    <AdminStatCard
                        label="Active Foster Assignments"
                        value={1}
                        icon="✅"
                    />
                </section>

                <section className="admin-dashboard-grid">
                    <div className="admin-panel admin-recent-panel">

                        <div className="admin-panel-heading">
                            <h2>Create Foster Assignment</h2>
                        </div>

                        <div className="admin-panel-heading">
                            <h2>Pending Adoption Applications</h2>
                            <button type="button" onClick={fetchApplications}>
                                Refresh
                            </button>
                        </div>

                        {loading ? (
                            <p className="admin-empty">Loading applications...</p>
                        ) : pendingApplications.length === 0 ? (
                            <p className="admin-empty">
                                There are no pending adoption applications.
                            </p>
                        ) : (
                            <div className="admin-application-list">
                                {pendingApplications.map((application) => (
                                    <ApplicationRow
                                        key={application._id}
                                        application={application}
                                        onReview={setSelectedApplication}
                                        onUpdateStatus={handleUpdateStatus}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="admin-panel admin-foster-panel">
                        <div className="admin-panel-heading">
                            <h2>Create Foster Assignment</h2>
                        </div>

                        <form className="admin-foster-form" onSubmit={handleCreateFosterAssignment}>
                            <label>
                                Pet Name
                                <input
                                    type="text"
                                    value={fosterForm.petName}
                                    onChange={(e) =>
                                        setFosterForm({ ...fosterForm, petName: e.target.value })
                                    }
                                    required
                                />
                            </label>

                            <label>
                                Pet Breed
                                <input
                                    type="text"
                                    value={fosterForm.petBreed}
                                    onChange={(e) =>
                                        setFosterForm({ ...fosterForm, petBreed: e.target.value })
                                    }
                                />
                            </label>

                            <label>
                                Pet Image URL
                                <input
                                    type="text"
                                    value={fosterForm.petImage}
                                    onChange={(e) =>
                                        setFosterForm({ ...fosterForm, petImage: e.target.value })
                                    }
                                    placeholder="Optional"
                                />
                            </label>

                            <label>
                                Foster Name
                                <input
                                    type="text"
                                    value={fosterForm.fosterName}
                                    onChange={(e) =>
                                        setFosterForm({ ...fosterForm, fosterName: e.target.value })
                                    }
                                    required
                                />
                            </label>

                            <label>
                                Foster Gmail
                                <input
                                    type="email"
                                    value={fosterForm.fosterEmail}
                                    onChange={(e) =>
                                        setFosterForm({ ...fosterForm, fosterEmail: e.target.value })
                                    }
                                    required
                                />
                            </label>

                            <label>
                                Care Instructions
                                <textarea
                                    value={fosterForm.careInstructions}
                                    onChange={(e) =>
                                        setFosterForm({
                                            ...fosterForm,
                                            careInstructions: e.target.value,
                                        })
                                    }
                                    placeholder="Example: Feed twice a day and submit weekly updates."
                                    required
                                />
                            </label>

                            {fosterMessage && (
                                <p className="admin-foster-message">{fosterMessage}</p>
                            )}

                            <button type="submit">
                                Assign Foster
                            </button>
                        </form>
                    </div>

                    <div className="admin-panel admin-ledger-panel">
                        <div className="admin-panel-heading">
                            <h2>Recent Activity :</h2>

                            <button type="button" onClick={fetchLedger}>
                                Refresh
                            </button>
                        </div>

                        {ledgerEntries.length === 0 ? (
                            <p className="admin-empty">No ledger Activity</p>
                        ) : (
                            <div className="admin-ledger-list">
                                {ledgerEntries.map((entry) => (
                                    <article className="admin-ledger-item" key={entry._id}>
                                        <span className={`admin-ledger-dot ${entry.type}`}></span>

                                        <div>
                                            <h3>{entry.description}</h3>

                                            <p>
                                                {entry.type} • {entry.status || "recorded"}
                                            </p>

                                            <small>
                                                {new Date(entry.createdAt).toLocaleDateString()}
                                            </small>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="admin-panel admin-capacity-panel">
                        <h2>Shelter Capacity</h2>

                        <div className="admin-donut">
                            <div>
                                <strong>67%</strong>
                                <span>Full</span>
                            </div>
                        </div>
                    </div>



                    <div className="admin-panel admin-impression-panel">
                        <h2>Impression</h2>

                        <div className="admin-bars">
                            <span style={{ height: "78%" }}></span>
                            <span style={{ height: "25%" }}></span>
                            <span style={{ height: "63%" }}></span>
                            <span style={{ height: "32%" }}></span>
                        </div>

                        <div className="admin-bar-labels">
                            <small>Mon</small>
                            <small>Tue</small>
                            <small>Wed</small>
                            <small>Thu</small>
                        </div>
                    </div>

                    <div className="admin-panel admin-donation-panel">
                        <h2>Total Donations Received</h2>
                        <strong>10$</strong>
                        <p>Update your payout method in Setting</p>
                        <button type="button">Withdraw All Earnings</button>
                    </div>
                </section>
            </section>

            <ApplicationModal
                application={selectedApplication}
                onClose={() => setSelectedApplication(null)}
            />
        </main>
    );

}