import { useEffect, useState } from "react";
import "../../styles/foster/FosterDashboard.css";
import assets from "../../data/assets.json";

const API = import.meta.env.VITE_BACKEND_URL;

const emptyApplicationForm = {
    phoneNumber: "",
    address: "",
    housingType: "House",
    hasPets: false,
    hasChildren: false,
    availableSpace: "",
    availableTime: "",
    fosterExperience: "",
    preferredAnimalType: "Both",
    capacity: 1,
};

export default function FosterDashboard({ setPage }) {
    const savedUser = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");

    const fosterEmail = String(savedUser.email || "").trim().toLowerCase();
    const fosterName = savedUser.username || savedUser.name || "Foster User";

    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const [application, setApplication] = useState(null);
    const [assignment, setAssignment] = useState(null);

    const [applicationForm, setApplicationForm] = useState(emptyApplicationForm);
    const [applicationSubmitting, setApplicationSubmitting] = useState(false);

    const [note, setNote] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [updateSubmitting, setUpdateSubmitting] = useState(false);

    async function fetchFosterApplication() {
        if (!fosterEmail) {
            setApplication(null);
            return;
        }

        const response = await fetch(
            `${API}/api/foster/applications/applicant/${encodeURIComponent(fosterEmail)}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            setApplication(null);
            return;
        }

        setApplication(data.application || null);
    }

    async function fetchAssignment() {
        if (!fosterEmail) {
            setAssignment(null);
            setMessage("No foster email found. Please log in again.");
            return;
        }

        const response = await fetch(
            `${API}/api/foster/assignments/foster/${encodeURIComponent(fosterEmail)}/active`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            setAssignment(null);
            setMessage(data.message || "Failed to fetch foster assignment.");
            return;
        }

        setAssignment(data.assignment || null);
    }

    async function fetchFosterData() {
        try {
            setLoading(true);
            setMessage("");

            await Promise.all([
                fetchFosterApplication(),
                fetchAssignment(),
            ]);
        } catch (error) {
            console.error("Fetch foster data error:", error);
            setMessage("Server error while loading foster dashboard.");
        } finally {
            setLoading(false);
        }
    }

    async function submitFosterApplication(e) {
        e.preventDefault();

        if (!fosterEmail) {
            setMessage("No foster email found. Please log in again.");
            return;
        }

        try {
            setApplicationSubmitting(true);
            setMessage("");

            const response = await fetch(`${API}/api/foster/applications`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    applicantName: fosterName,
                    applicantEmail: fosterEmail,
                    ...applicationForm,
                    capacity: Number(applicationForm.capacity || 1),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to submit foster application.");
                return;
            }

            setApplication(data.application);
            setApplicationForm(emptyApplicationForm);
            setMessage("Foster application submitted. Please wait for admin approval.");
            setActiveTab("application");
        } catch (error) {
            console.error("Submit foster application error:", error);
            setMessage("Server error while submitting foster application.");
        } finally {
            setApplicationSubmitting(false);
        }
    }

    async function submitWeeklyUpdate(e) {
        e.preventDefault();

        if (!assignment) {
            setMessage("No active foster assignment found.");
            return;
        }

        try {
            setUpdateSubmitting(true);
            setMessage("");

            const response = await fetch(
                `${API}/api/foster/assignments/${assignment._id}/updates`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        note,
                        photoUrl,
                        submittedBy: fosterName,
                        submittedByEmail: fosterEmail,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to submit weekly update.");
                return;
            }

            setAssignment(data.assignment);
            setNote("");
            setPhotoUrl("");
            setMessage("Weekly update submitted.");
        } catch (error) {
            console.error("Submit weekly update error:", error);
            setMessage("Server error while submitting weekly update.");
        } finally {
            setUpdateSubmitting(false);
        }
    }

    function formatDate(dateValue) {
        if (!dateValue) return "N/A";

        return new Date(dateValue).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function renderOverview() {
        return (
            <section className="foster-overview">
                <div className="foster-stat-grid">
                    <article className="foster-stat-card">
                        <span>Application Status</span>
                        <strong>{application?.status || "Not Submitted"}</strong>
                    </article>

                    <article className="foster-stat-card">
                        <span>Active Assignment</span>
                        <strong>{assignment ? assignment.petName : "None"}</strong>
                    </article>

                    <article className="foster-stat-card">
                        <span>Weekly Updates</span>
                        <strong>{assignment?.updates?.length || 0}</strong>
                    </article>
                </div>

                <section className="foster-panel foster-welcome-panel">
                    <div>
                        <p className="foster-label">Welcome back</p>
                        <h2>{fosterName}</h2>
                        <p>
                            Submit your foster application, wait for shelter approval,
                            then view your active foster assignment and submit weekly updates.
                        </p>
                    </div>

                    <div className="foster-quick-actions">
                        <button type="button" onClick={() => setActiveTab("application")}>
                            View Application
                        </button>

                        <button type="button" onClick={() => setActiveTab("assignment")}>
                            View Assignment
                        </button>
                    </div>
                </section>

                {message && <p className="foster-message">{message}</p>}
            </section>
        );
    }

    function renderApplication() {
        const canSubmitApplication = !application || application.status === "rejected";

        return (
            <section className="foster-panel foster-application-panel">
                <div className="foster-section-heading">
                    <div>
                        <p className="foster-label">Foster Caregiver Application</p>
                        <h2>Application Status</h2>
                    </div>

                    <button type="button" onClick={fetchFosterData}>
                        Refresh
                    </button>
                </div>

                {application && (
                    <div className="foster-application-status-card">
                        <strong className={`foster-status-pill ${application.status}`}>
                            {application.status}
                        </strong>

                        <p>
                            <b>Applicant:</b> {application.applicantName}
                        </p>

                        <p>
                            <b>Email:</b> {application.applicantEmail}
                        </p>

                        <p>
                            <b>Preferred Animal:</b> {application.preferredAnimalType}
                        </p>

                        <p>
                            <b>Capacity:</b> {application.capacity}
                        </p>

                        {application.reviewNotes && (
                            <p>
                                <b>Review Notes:</b> {application.reviewNotes}
                            </p>
                        )}

                        {application.status === "pending" && (
                            <p>Your application is waiting for admin review.</p>
                        )}

                        {application.status === "approved" && (
                            <p>Your application is approved. Please wait for the shelter to assign an animal.</p>
                        )}

                        {application.status === "rejected" && (
                            <p>Your previous application was rejected. You may submit a new one below.</p>
                        )}
                    </div>
                )}

                {canSubmitApplication && (
                    <form className="foster-application-form" onSubmit={submitFosterApplication}>
                        <label>
                            Phone Number
                            <input
                                value={applicationForm.phoneNumber}
                                onChange={(e) =>
                                    setApplicationForm({
                                        ...applicationForm,
                                        phoneNumber: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Address
                            <input
                                value={applicationForm.address}
                                onChange={(e) =>
                                    setApplicationForm({
                                        ...applicationForm,
                                        address: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Housing Type
                            <select
                                value={applicationForm.housingType}
                                onChange={(e) =>
                                    setApplicationForm({
                                        ...applicationForm,
                                        housingType: e.target.value,
                                    })
                                }
                            >
                                <option value="House">House</option>
                                <option value="Apartment">Apartment</option>
                                <option value="Condo">Condo</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>

                        <label>
                            Preferred Animal
                            <select
                                value={applicationForm.preferredAnimalType}
                                onChange={(e) =>
                                    setApplicationForm({
                                        ...applicationForm,
                                        preferredAnimalType: e.target.value,
                                    })
                                }
                            >
                                <option value="Dog">Dog</option>
                                <option value="Cat">Cat</option>
                                <option value="Both">Both</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>

                        <label>
                            Capacity
                            <input
                                type="number"
                                min="1"
                                value={applicationForm.capacity}
                                onChange={(e) =>
                                    setApplicationForm({
                                        ...applicationForm,
                                        capacity: e.target.value,
                                    })
                                }
                            />
                        </label>

                        <label>
                            Available Space
                            <input
                                value={applicationForm.availableSpace}
                                onChange={(e) =>
                                    setApplicationForm({
                                        ...applicationForm,
                                        availableSpace: e.target.value,
                                    })
                                }
                                placeholder="Example: spare room, yard, crate space"
                                required
                            />
                        </label>

                        <label>
                            Available Time
                            <input
                                value={applicationForm.availableTime}
                                onChange={(e) =>
                                    setApplicationForm({
                                        ...applicationForm,
                                        availableTime: e.target.value,
                                    })
                                }
                                placeholder="Example: evenings, weekends"
                                required
                            />
                        </label>

                        <label className="foster-full-field">
                            Foster Experience
                            <textarea
                                value={applicationForm.fosterExperience}
                                onChange={(e) =>
                                    setApplicationForm({
                                        ...applicationForm,
                                        fosterExperience: e.target.value,
                                    })
                                }
                                placeholder="Describe your foster experience or write beginner."
                                required
                            />
                        </label>

                        <label className="foster-check-field">
                            <input
                                type="checkbox"
                                checked={applicationForm.hasPets}
                                onChange={(e) =>
                                    setApplicationForm({
                                        ...applicationForm,
                                        hasPets: e.target.checked,
                                    })
                                }
                            />
                            Has pets at home
                        </label>

                        <label className="foster-check-field">
                            <input
                                type="checkbox"
                                checked={applicationForm.hasChildren}
                                onChange={(e) =>
                                    setApplicationForm({
                                        ...applicationForm,
                                        hasChildren: e.target.checked,
                                    })
                                }
                            />
                            Has children at home
                        </label>

                        {message && <p className="foster-message">{message}</p>}

                        <button type="submit" disabled={applicationSubmitting}>
                            {applicationSubmitting ? "Submitting..." : "Submit Foster Application"}
                        </button>
                    </form>
                )}
            </section>
        );
    }

    function renderAssignment() {
        if (loading) {
            return (
                <section className="foster-panel foster-empty-card">
                    <h2>Loading active assignment...</h2>
                </section>
            );
        }

        if (!assignment) {
            return (
                <section className="foster-panel foster-empty-card">
                    <h2>No active foster assignment yet</h2>
                    <p>
                        Once your foster application is approved and the shelter assigns you an animal,
                        the assignment details will appear here.
                    </p>

                    <button type="button" onClick={() => setActiveTab("application")}>
                        Check Application
                    </button>
                </section>
            );
        }

        return (
            <section className="foster-panel foster-assignment-card">
                <div className="foster-pet-image">
                    {assignment.petImage ? (
                        <img src={assignment.petImage} alt={assignment.petName} />
                    ) : (
                        <span>🐾</span>
                    )}
                </div>

                <div className="foster-assignment-info">
                    <p className="foster-label">Active Foster Assignment</p>
                    <h2>{assignment.petName}</h2>
                    <p>{assignment.petBreed || "Unknown breed"}</p>

                    <div className="foster-meta">
                        <span>Status: {assignment.status}</span>
                        <span>Shelter: {assignment.shelterName || "RescueBase Shelter"}</span>
                        <span>Started: {formatDate(assignment.startDate)}</span>
                    </div>

                    <div className="foster-instructions">
                        <h3>Care Instructions</h3>
                        <p>{assignment.careInstructions}</p>
                    </div>
                </div>
            </section>
        );
    }

    function renderUpdates() {
        if (!assignment) {
            return (
                <section className="foster-panel foster-empty-card">
                    <h2>No active assignment</h2>
                    <p>You can submit weekly updates after the shelter assigns you an animal.</p>
                </section>
            );
        }

        return (
            <section className="foster-update-layout">
                <form className="foster-panel foster-update-form" onSubmit={submitWeeklyUpdate}>
                    <h2>Submit Weekly Update</h2>

                    <label>
                        Update Note
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Example: Max is eating well and active this week."
                            required
                        />
                    </label>

                    <label>
                        Photo URL
                        <input
                            value={photoUrl}
                            onChange={(e) => setPhotoUrl(e.target.value)}
                            placeholder="Paste image URL for prototype"
                        />
                    </label>

                    {message && <p className="foster-message">{message}</p>}

                    <button type="submit" disabled={updateSubmitting}>
                        {updateSubmitting ? "Submitting..." : "Submit Update"}
                    </button>
                </form>

                <section className="foster-panel foster-updates-panel">
                    <h2>Update History</h2>

                    {!assignment.updates || assignment.updates.length === 0 ? (
                        <p className="foster-empty-text">No weekly updates submitted yet.</p>
                    ) : (
                        <div className="foster-update-list">
                            {[...assignment.updates].reverse().map((update, index) => (
                                <article
                                    className="foster-update-item"
                                    key={update._id || `${update.createdAt}-${index}`}
                                >
                                    <p>{update.note}</p>

                                    {update.photoUrl && (
                                        <img src={update.photoUrl} alt="Foster update" />
                                    )}

                                    <small>
                                        {update.createdAt
                                            ? new Date(update.createdAt).toLocaleString()
                                            : "Just now"}
                                    </small>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </section>
        );
    }

    function renderMessages() {
        return (
            <section className="foster-panel foster-empty-card">
                <h2>Messages</h2>
                <p>Shelter messages will appear here in the next version of the prototype.</p>
            </section>
        );
    }

    function renderFosterContent() {
        if (activeTab === "overview") return renderOverview();
        if (activeTab === "application") return renderApplication();
        if (activeTab === "assignment") return renderAssignment();
        if (activeTab === "updates") return renderUpdates();
        if (activeTab === "messages") return renderMessages();

        return renderOverview();
    }

    useEffect(() => {
        fetchFosterData();
    }, []);

    return (
        <main className="foster-page">
            <aside className="foster-sidebar">
                <div className="foster-logo">
                    <img src={assets.logo} alt="RescueBase logo" />
                    <span>RescueBase</span>
                </div>

                <nav className="foster-menu">
                    <button
                        className={activeTab === "overview" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("overview")}
                    >
                        Overview
                    </button>

                    <button
                        className={activeTab === "application" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("application")}
                    >
                        Foster Application
                    </button>

                    <button
                        className={activeTab === "assignment" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("assignment")}
                    >
                        Active Assignment
                    </button>

                    <button
                        className={activeTab === "updates" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("updates")}
                    >
                        Weekly Updates
                    </button>

                    <button
                        className={activeTab === "messages" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("messages")}
                    >
                        Messages
                    </button>
                </nav>

                <button
                    className="foster-logout"
                    type="button"
                    onClick={() => setPage("home")}
                >
                    Logout
                </button>
            </aside>

            <section className="foster-main">
                <header className="foster-topbar">
                    <div>
                        <h1>Foster Dashboard</h1>
                        <p>Welcome back, {fosterName}.</p>
                    </div>

                    <button type="button" onClick={fetchFosterData}>
                        Refresh
                    </button>
                </header>

                {renderFosterContent()}
            </section>
        </main>
    );
}