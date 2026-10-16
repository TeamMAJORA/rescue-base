import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function FosterAssignment({ application = null }) {
    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    const fosterEmail = String(
        savedUser.email || ""
    )
        .trim()
        .toLowerCase();

    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [message, setMessage] = useState("");
    const token = localStorage.getItem("token");

    // The pet whose details are shown below the tabs
    const assignment =
        assignments.find((item) => item._id === selectedId) ||
        assignments[0] ||
        null;

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
                setAssignments([]);
                setMessage(
                    data.message ||
                    "Unable to load foster assignment."
                );
                return;
            }
            setAssignments(
                data.assignments || (data.assignment ? [data.assignment] : [])
            );
            setMessage("");

        } catch (error) {
            console.error(error);

            setAssignments([]);

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

    // Weekly report: "sent" if one went in during the last 7 days, otherwise when it's due
    function reportStatus(item) {
        const updates = item.updates || [];
        const last = updates.length ? updates[updates.length - 1].createdAt : null;
        const DAY = 24 * 60 * 60 * 1000;

        if (last && Date.now() - new Date(last).getTime() < 7 * DAY) {
            return { label: "Report sent", tone: "is-sent" };
        }

        const due = new Date(last || item.startDate || item.createdAt || Date.now());
        due.setDate(due.getDate() + 7);

        if (due.getTime() < Date.now()) {
            return { label: "Report overdue", tone: "is-overdue" };
        }

        return {
            label: `Report due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
            tone: "is-due",
        };
    }

    function petSubtitle(item) {
        const age = Number(item.animalId?.age);
        const ageText = age > 0 ? `${age} ${age === 1 ? "year" : "years"}` : "";
        return [item.petBreed || "Unknown breed", ageText].filter(Boolean).join(" · ");
    }

    // Capacity comes from the approved foster application
    const capacity = Math.max(Number(application?.capacity) || 1, assignments.length);
    const openSlots = capacity - assignments.length;

    const petTabs = (
        <div className="fat-strip">
            <div className="fat-tabs" role="tablist" aria-label="Your foster animals">
                {assignments.map((item) => {
                    const selected = item._id === assignment?._id;
                    const report = reportStatus(item);

                    return (
                        <button
                            key={item._id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={`fat-tab ${selected ? "is-selected" : ""}`}
                            onClick={() => setSelectedId(item._id)}
                        >
                            <span className="fat-photo">
                                {item.petImage ? (
                                    <img src={item.petImage} alt="" />
                                ) : (
                                    <img src="/icons/brown paw.svg" alt="" className="fat-photo-icon" />
                                )}
                            </span>

                            <span className="fat-info">
                                <b>{item.petName}</b>
                                <small>{petSubtitle(item)}</small>
                                <span className="fat-pills">
                                    <span className="fat-pill is-active">Active</span>
                                    <span className={`fat-pill ${report.tone}`}>{report.label}</span>
                                </span>
                            </span>

                            {selected && (
                                <span className="fat-check" aria-hidden="true">
                                    <img src="/icons/checkmark.svg" alt="" />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="fat-capacity">
                <span className="fat-eyebrow">Foster Capacity</span>
                <b>
                    {assignments.length} of {capacity} {capacity === 1 ? "slot" : "slots"}
                </b>
                <span className="fat-bar" aria-hidden="true">
                    {Array.from({ length: capacity }, (_, index) => (
                        <i key={index} className={index < assignments.length ? "is-used" : ""} />
                    ))}
                </span>
                <small>
                    {openSlots > 0
                        ? `You can take ${openSlots} more ${openSlots === 1 ? "animal" : "animals"}.`
                        : "You're at full capacity."}
                </small>
            </div>
        </div>
    );

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

            {petTabs}

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
