import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;


// Line icons (same set/style as the admin Foster Care page)
const FA_ICONS = {
    home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    calendar: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
        </>
    ),
    pulse: <path d="M3 12h4l3-7 4 14 3-7h4" />,
    flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
    report: (
        <>
            <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
            <path d="M14 3v5h5M9 13h6M9 17h6" />
        </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    chat: <path d="M4 5h16v11H9l-5 4z" />,
};

function FaIcon({ name, size = 18 }) {
    return (
        <svg
            className="fah-icon"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {FA_ICONS[name]}
        </svg>
    );
}

export default function FosterAssignment({ application = null, onNavigate }) {
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
                <div className="fah-photo">
                    {assignment.petImage ? (
                        <img src={assignment.petImage} alt={assignment.petName} />
                    ) : (
                        <img src="/icons/brown paw.svg" alt="" className="fah-photo-icon" />
                    )}
                    <span className={`fah-badge is-${assignment.status}`}>
                        {assignment.status}
                    </span>
                </div>

                <div className="fah-body">
                    <span className="fah-eyebrow">Current Foster Assignment</span>
                    <h2 className="fah-name">{assignment.petName}</h2>
                    <p className="fah-breed">{petSubtitle(assignment)}</p>

                    <div className="fah-facts">
                        <div className="fah-fact">
                            <span className="fah-fact-icon"><FaIcon name="home" /></span>
                            <div>
                                <small>Shelter</small>
                                <b>{assignment.shelterName || "RescueBase Shelter"}</b>
                            </div>
                        </div>

                        <div className="fah-fact">
                            <span className="fah-fact-icon"><FaIcon name="calendar" /></span>
                            <div>
                                <small>Assigned Date</small>
                                <b>{formatDate(assignment.startDate)}</b>
                            </div>
                        </div>

                        <div className="fah-fact">
                            <span className="fah-fact-icon"><FaIcon name="pulse" /></span>
                            <div>
                                <small>Foster Care Status</small>
                                <b className={`fah-status is-${assignment.status}`}>{assignment.status}</b>
                            </div>
                        </div>

                        <div className="fah-fact">
                            <span className="fah-fact-icon"><FaIcon name="flag" /></span>
                            <div>
                                <small>Expected Completion</small>
                                <b>{assignment.endDate ? formatDate(assignment.endDate) : "Not set yet"}</b>
                            </div>
                        </div>
                    </div>

                    <div className="fah-actions">
                        <button
                            type="button"
                            className="fah-btn is-primary"
                            onClick={() => onNavigate?.("updates")}
                        >
                            <FaIcon name="report" size={16} />
                            Submit Weekly Report
                        </button>

                        <button
                            type="button"
                            className="fah-btn is-medical"
                            onClick={() => onNavigate?.("medical")}
                        >
                            <FaIcon name="plus" size={16} />
                            Request Medical Assistance
                        </button>

                        <button
                            type="button"
                            className="fah-btn is-ghost"
                            onClick={() => onNavigate?.("feedback")}
                        >
                            <FaIcon name="chat" size={16} />
                            Contact Shelter
                        </button>
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
            </div>
            {message && (
                <div className="assignment-message">
                    {message}
                </div>
            )}
        </section>
    );
}
