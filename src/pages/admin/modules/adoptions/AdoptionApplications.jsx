import {
    useEffect, useMemo, useState
} from "react";

const API = import.meta.env.VITE_BACKEND_URL;

function ApplicationRow({ application, onReview, onUpdateStatus }) {
    return (
        <article className="admin-application-row">
            <div>
                <h3>{application.fullName || "Unknown Applicant"}</h3>
                <p>{application.email}</p>
                <p>
                    Pet : <strong>{application.petName || "Not Selected"}</strong>
                </p>
            </div>

            <span className={`admin-status-pill ${application.status}`}>
                {application.status}
            </span>

            <div className="admin-application-status">
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
    )
}

export default function AdoptionApplications() {
    const [applications, setApplications] = useState([]);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [loading, setLoading] = useState(true);

    const pendingApplications = useMemo(() => {
        return applications.filter(
            (app) => String(app.status).toLowerCase() === "pending"
        );
    }, [applications]);

    async function fetchApplications() {
        try {
            setLoading(true);

            const response = await fetch(`${API}/api/adoptions`);
            const data = await response.json();

            console.log("Adoption applications:", data);

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
            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const response = await fetch(`${API}/api/adoptions/${id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status,
                    adminName: savedUser.name || savedUser.username || "Admin User",
                    adminEmail: savedUser.email || "admin",
                }),
            });

            const data = await response.json();
            console.log("Update application status:", data);

            if (data.success) {
                fetchApplications();
            }
        } catch (error) {
            console.error("Update status error:", error);
        }
    }

    useEffect(() => {
        fetchApplications();
    }, []);

    return (
        <section className="admin-adoption-page">
            <section className="admin-panel admin-adoption-summary">
                <article>
                    <span>Total Applications</span>
                    <strong>{applications.length}</strong>
                </article>

                <article>
                    <span>Pending Applications</span>
                    <strong>{pendingApplications.length}</strong>
                </article>
            </section>

            <section className="admin-panel admin-adoption-list-panel">
                <div className="admin-panel-heading">
                    <h2>Adoption Applications</h2>

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
            </section>

            <ApplicationModal
                application={selectedApplication}
                onClose={() => setSelectedApplication(null)}
            />
        </section>
    );
}