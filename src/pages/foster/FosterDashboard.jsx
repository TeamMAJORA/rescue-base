import { useEffect, useState } from "react";
import "../../styles/foster/FosterDashboard.css";
import assets from "../../data/assets.json";

const API = import.meta.env.VITE_BACKEND_URL;

export default function FosterDashboard({ setPage }) {
    const savedUser = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");

    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [message, setMessage] = useState("");
    const [activeTab, setActiveTab] = useState("dashboard");

    const fosterEmail = String(savedUser.email || "").trim().toLowerCase();

    async function fetchAssignment() {
        try {
            setLoading(true);
            setMessage("");

            console.log("API:", API);
            console.log("Saved user:", savedUser);
            console.log("Foster email being searched:", fosterEmail);

            if (!fosterEmail) {
                setAssignment(null);
                setMessage("No foster email found. Please log in again.");
                return;
            }

            const fetchUrl = `${API}/api/foster/assignments/foster/${encodeURIComponent(
                fosterEmail
            )}/active`;

            console.log("Fetch URL:", fetchUrl);

            const response = await fetch(fetchUrl);
            const data = await response.json();

            console.log("Foster assignment:", data);

            if (!response.ok || !data.success) {
                setAssignment(null);
                setMessage(data.message || "Failed to fetch foster assignment.");
                return;
            }

            if (!data.assignment) {
                setAssignment(null);
                setMessage(
                    `No active assignment found for ${fosterEmail}. Check if admin used the same Gmail.`
                );
                return;
            }

            setAssignment(data.assignment);
        } catch (error) {
            console.error("Fetch foster assignment error:", error);
            setAssignment(null);
            setMessage("Server error while loading foster assignment.");
        } finally {
            setLoading(false);
        }
    }

    async function submitUpdate(e) {
        e.preventDefault();

        if (!assignment) return;

        try {
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
                        submittedBy:
                            savedUser.username || savedUser.name || "Foster User",
                        submittedByEmail: fosterEmail,
                    }),
                }
            );

            const data = await response.json();
            console.log("Submit foster update:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to submit update.");
                return;
            }

            setAssignment(data.assignment);
            setNote("");
            setPhotoUrl("");
            setMessage("Weekly update submitted.");
        } catch (error) {
            console.error("Submit foster update error:", error);
            setMessage("Server error. Please try again.");
        }
    }

    useEffect(() => {
        fetchAssignment();
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
                        className={activeTab === "dashboard" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("dashboard")}
                    >
                        Foster Dashboard
                    </button>

                    <button
                        className={activeTab === "assignments" ? "active" : ""}
                        type="button"
                        onClick={() => setActiveTab("assignments")}
                    >
                        Assignments
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
                        <p>
                            Welcome back,{" "}
                            {savedUser.username || savedUser.name || "Foster"}.
                        </p>
                    </div>

                    <button type="button" onClick={fetchAssignment}>
                        Refresh
                    </button>
                </header>

                {loading ? (
                    <section className="foster-empty-card">
                        <h2>Loading foster assignment...</h2>
                    </section>
                ) : !assignment ? (
                    <section className="foster-empty-card">
                        <h2>No active foster assignment yet</h2>
                        <p>
                            Once the shelter assigns you an animal, the details will
                            appear here.
                        </p>

                        {message && <p className="foster-message">{message}</p>}
                    </section>
                ) : (
                    <>
                        {(activeTab === "dashboard" || activeTab === "assignments") && (
                            <section className="foster-assignment-card">
                                <div className="foster-pet-image">
                                    {assignment.petImage ? (
                                        <img
                                            src={assignment.petImage}
                                            alt={assignment.petName}
                                        />
                                    ) : (
                                        <span>🐾</span>
                                    )}
                                </div>

                                <div className="foster-assignment-info">
                                    <p className="foster-label">
                                        Active Foster Assignment
                                    </p>

                                    <h2>{assignment.petName}</h2>
                                    <p>{assignment.petBreed || "Unknown breed"}</p>

                                    <div className="foster-meta">
                                        <span>Status: {assignment.status}</span>
                                        <span>
                                            Shelter:{" "}
                                            {assignment.shelterName ||
                                                "RescueBase Shelter"}
                                        </span>
                                        <span>
                                            Started:{" "}
                                            {assignment.startDate
                                                ? new Date(
                                                    assignment.startDate
                                                ).toLocaleDateString()
                                                : "N/A"}
                                        </span>
                                    </div>

                                    <div className="foster-instructions">
                                        <h3>Care Instructions</h3>
                                        <p>{assignment.careInstructions}</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {(activeTab === "dashboard" || activeTab === "updates") && (
                            <section className="foster-grid">
                                <form
                                    className="foster-update-form"
                                    onSubmit={submitUpdate}
                                >
                                    <h2>Submit Weekly Update</h2>

                                    <label>
                                        Update Note
                                        <textarea
                                            value={note}
                                            onChange={(e) =>
                                                setNote(e.target.value)
                                            }
                                            placeholder="Example: Max is eating well and active this week."
                                            required
                                        />
                                    </label>

                                    <label>
                                        Photo URL
                                        <input
                                            value={photoUrl}
                                            onChange={(e) =>
                                                setPhotoUrl(e.target.value)
                                            }
                                            placeholder="Paste image URL for prototype"
                                        />
                                    </label>

                                    {message && (
                                        <p className="foster-message">
                                            {message}
                                        </p>
                                    )}

                                    <button type="submit">Submit Update</button>
                                </form>

                                <section className="foster-updates-panel">
                                    <h2>Update History</h2>

                                    {!assignment.updates ||
                                        assignment.updates.length === 0 ? (
                                        <p className="foster-empty-text">
                                            No weekly updates submitted yet.
                                        </p>
                                    ) : (
                                        <div className="foster-update-list">
                                            {[...assignment.updates]
                                                .reverse()
                                                .map((update, index) => (
                                                    <article
                                                        className="foster-update-item"
                                                        key={
                                                            update._id ||
                                                            `${update.createdAt}-${index}`
                                                        }
                                                    >
                                                        <p>{update.note}</p>

                                                        {update.photoUrl && (
                                                            <img
                                                                src={update.photoUrl}
                                                                alt="Foster update"
                                                            />
                                                        )}

                                                        <small>
                                                            {update.createdAt
                                                                ? new Date(
                                                                    update.createdAt
                                                                ).toLocaleString()
                                                                : "Just now"}
                                                        </small>
                                                    </article>
                                                ))}
                                        </div>
                                    )}
                                </section>
                            </section>
                        )}

                        {activeTab === "messages" && (
                            <section className="foster-empty-card">
                                <h2>Messages</h2>
                                <p>
                                    Shelter messages will appear here in the next
                                    version of the prototype.
                                </p>
                            </section>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}