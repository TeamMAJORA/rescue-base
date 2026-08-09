import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function FosterAssignment() {
    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    const fosterEmail = String(
        savedUser.email || ""
    )
        .trim()
        .toLowerCase();

    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState(null);
    const [message, setMessage] = useState("");
    const token = localStorage.getItem("token");

    async function loadAssignment() {
        try {
            setLoading(true);

            const response = await fetch(
                `${API}/api/foster/assignments/me/active`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setAssignment(null);
                setMessage(
                    data.message ||
                    "Unable to load foster assignment."
                );
                return;
            }
            setAssignment(data.assignment);
            setMessage("");

        } catch (error) {
            console.error(error);

            setAssignment(null);

            setMessage("Server error while loading assignent.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (fosterEmail) {
            loadAssignment();
        }
    }, []);

    function formatDate(date) {
        if (!date) return "N/A";

        return new Date(date).toLocaleDateString(
            "en-PH",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
            }
        );
    }

    if (loading) {
        return (
            <section className="foster-panel">
                <div className="foster-loading">
                    Loading assignment...
                </div>
            </section>
        );
    }

    if (!assignment) {
        return (
            <section className="foster-panel">

                <div className="foster-section-heading">
                    <div>
                        <span>Current Foster</span>
                        <h2>Foster Assignment</h2>
                    </div>
                </div>

                <div className="foster-empty-state">
                    <h3>No Active Foster Assignment</h3>
                    <p>
                        You currently don't have an
                        assigned rescue animal.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="foster-panel">
            <div className="foster-section-heading">
                <div>
                    <span>Current Foster</span>
                    <h2>
                        Foster Assignment
                    </h2>
                </div>
            </div>

            <div className="foster-assignment-top">
                <div className="foster-pet-card">
                    <img
                        src={assignment.petImage}
                        alt={assignment.petName}
                    />
                    <div>
                        <h2>
                            {assignment.petName}
                        </h2>
                        <p>
                            {assignment.petBreed}
                        </p>
                        <span
                            className={`assignment-status ${assignment.status}`}
                        >
                            {assignment.status}
                        </span>
                    </div>
                </div>

                <div className="foster-assignment-details">
                    <h3>
                        Assignment Details
                    </h3>
                    <div className="assignment-grid">
                        <div>
                            <span>Shelter</span>
                            <strong>
                                {assignment.shelterName}
                            </strong>
                        </div>

                        <div>

                            <span>
                                Assigned Date
                            </span>

                            <strong>
                                {formatDate(
                                    assignment.startDate
                                )}
                            </strong>

                        </div>

                        <div>
                            <span>
                                Foster Care Status
                            </span>

                            <strong>
                                {assignment.status}
                            </strong>

                        </div>

                        <div>
                            <span>
                                Expected Completion
                            </span>

                            <strong>
                                {formatDate(
                                    assignment.endDate
                                )}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
            <div className="foster-assignment-sections">

                <section className="assignment-card">
                    <h3>Care Instructions</h3>
                    <p>
                        {assignment.careInstructions ||
                            "No care instructions were provided by the shelter."}
                    </p>
                </section>

                <section className="assignment-card">
                    <h3>Recent Weekly Updates</h3>
                    {assignment.updates &&
                        assignment.updates.length > 0 ? (

                        <div className="assignment-updates">

                            {assignment.updates
                                .slice()
                                .reverse()
                                .map((update) => (

                                    <div
                                        key={update._id}
                                        className="assignment-update-card"
                                    >

                                        <div className="assignment-update-header">

                                            <strong>
                                                {formatDate(
                                                    update.createdAt
                                                )}
                                            </strong>

                                            <span>
                                                {update.submittedBy}
                                            </span>

                                        </div>

                                        <p>
                                            {update.note}
                                        </p>

                                        {update.photoUrl && (
                                            <img
                                                src={update.photoUrl}
                                                alt="Weekly update"
                                            />
                                        )}
                                    </div>
                                ))}
                        </div>
                    ) : (

                        <div className="assignment-empty">

                            No weekly updates submitted yet.

                        </div>

                    )}

                </section>

                <section className="assignment-card">

                    <h3>Quick Actions</h3>

                    <div className="assignment-actions">

                        <button
                            type="button"
                            className="assignment-primary"
                        >
                            Submit Weekly Report
                        </button>

                        <button
                            type="button"
                            className="assignment-secondary"
                        >
                            Request Medical Assistance
                        </button>

                        <button
                            type="button"
                            className="assignment-secondary"
                        >
                            Contact Shelter
                        </button>
                    </div>
                </section>
            </div>
            {message && (
                <div className="assignment-message">
                    {message}
                </div>
            )}
        </section>
    );
}
