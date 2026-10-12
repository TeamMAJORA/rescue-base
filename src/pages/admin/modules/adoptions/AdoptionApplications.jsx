import { useEffect, useMemo, useState } from "react";


const API = import.meta.env.VITE_BACKEND_URL;

const ACTIVE_STATUSES = [
    "pending",
    "interview_scheduled",
    "interview_completed",
];

const FILTER_OPTIONS = {
    active: [
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "interview", label: "Interview" },
    ],
    history: [
        { value: "all", label: "All" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "withdrawn", label: "Withdrawn" },
    ],
};

function formatDate(date) {
    if (!date) return "Not scheduled";

    const parsed = new Date(date);

    return Number.isNaN(parsed.getTime())
        ? "Invalid date"
        : parsed.toLocaleString();
}

function getLocalDateTimeValue(date) {
    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 16);
}

function RejectModal({ application, onClose, onConfirm, loading }) {
    const [reason, setReason] = useState("");

    useEffect(() => {
        setReason("");
    }, [application]);

    if (!application) return null;

    function handleSubmit(event) {
        event.preventDefault();

        const trimmedReason = reason.trim();

        if (!trimmedReason || loading) return;

        onConfirm(application._id, trimmedReason);
    }

    return (
        <div className="admin-modal-overlay">
            <section className="admin-modal">
                <button
                    className="admin-modal-class"
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                >
                    x
                </button>

                <h2>Reject Adoption Application</h2>

                <p>
                    Provide a reason for rejecting the application of{" "}
                    <strong>{application.fullName}</strong> for{" "}
                    <strong>{application.petName}</strong>.
                </p>

                <form onSubmit={handleSubmit}>
                    <label htmlFor="rejection-reason">
                        Rejection Reason
                    </label>

                    <textarea
                        id="rejection-reason"
                        value={reason}
                        onChange={(event) =>
                            setReason(event.target.value)
                        }
                        placeholder="Explain why this application is being rejected..."
                        rows={5}
                        required
                        disabled={loading}
                    />

                    <div className="admin-modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="reject"
                            disabled={loading || !reason.trim()}
                        >
                            {loading
                                ? "Rejecting..."
                                : "Confirm Rejection"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

function InterviewModal({
    application,
    onClose,
    onConfirm,
    loading,
}) {
    const [interviewDate, setInterviewDate] = useState("");

    useEffect(() => {
        if (application?.interviewSchedule) {
            const parsed = new Date(application.interviewSchedule);

            if (!Number.isNaN(parsed.getTime())) {
                setInterviewDate(getLocalDateTimeValue(parsed));
                return;
            }
        }

        setInterviewDate("");
    }, [application]);

    if (!application) return null;

    function handleSubmit(event) {
        event.preventDefault();

        if (!interviewDate || loading) return;

        const selectedDate = new Date(interviewDate);

        if (
            Number.isNaN(selectedDate.getTime()) ||
            selectedDate.getTime() <= Date.now()
        ) {
            alert("Please select a valid future interview date and time.");
            return;
        }

        onConfirm(application._id, selectedDate.toISOString());
    }

    return (
        <div className="admin-modal-overlay">
            <section className="admin-modal">
                <button
                    className="admin-modal-class"
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                >
                    x
                </button>

                <h2>
                    {application.interviewSchedule
                        ? "Reschedule Adoption Interview"
                        : "Schedule Adoption Interview"}
                </h2>

                <p>
                    Applicant: <strong>{application.fullName}</strong>
                </p>

                <p>
                    Pet: <strong>{application.petName}</strong>
                </p>

                <form onSubmit={handleSubmit}>
                    <label htmlFor="adoption-interview-date">
                        Interview Date and Time
                    </label>

                    <input
                        id="adoption-interview-date"
                        type="datetime-local"
                        value={interviewDate}
                        min={getLocalDateTimeValue(new Date())}
                        onChange={(event) =>
                            setInterviewDate(event.target.value)
                        }
                        required
                        disabled={loading}
                    />

                    <p>
                        The pet will remain available during the interview
                        and application review process.
                    </p>

                    <div className="admin-modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="approve"
                            disabled={loading || !interviewDate}
                        >
                            {loading
                                ? "Scheduling..."
                                : "Confirm Interview"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

function getInitials(name) {
    return String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function formatShortDate(date, withTime = false) {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toLocaleString(
        "en-PH",
        withTime
            ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
            : { month: "short", day: "numeric", year: "numeric" }
    );
}

function ApplicationRow({
    application,
    onReview,
    onSchedule,
    onCompleteInterview,
    onApprove,
    onReject,
    busy,
}) {
    const status = String(
        application.status || "pending"
    ).toLowerCase();

    const statusLabel = {
        pending: "Pending review",
        interview_scheduled: "Interview scheduled",
        interview_completed: "Interview done",
        approved: "Approved",
        rejected: "Rejected",
        withdrawn: "Withdrawn",
    }[status] || status.replaceAll("_", " ");

    const household = [
        application.homeType,
        application.hasChildren === "Yes" ? "Has kids" : "No kids",
        application.hasOtherPets === "Yes" ? "Has pets" : "No pets",
    ].filter(Boolean);

    return (
        <article className="admin-application-row">
            <div className="admin-application-applicant">
                <span className="admin-application-avatar" aria-hidden="true">
                    {getInitials(application.fullName)}
                </span>

                <div>
                    <h3>{application.fullName || "Unknown Applicant"}</h3>
                    <p>{application.email}</p>
                </div>
            </div>

            <div className="admin-application-pet">
                <span className="admin-application-pet-thumb">
                    {application.petImage ? (
                        <img src={application.petImage} alt={application.petName} />
                    ) : (
                        <img
                            src="/icons/sidebar/brown paw.svg"
                            alt=""
                            className="is-placeholder"
                        />
                    )}
                </span>

                <div>
                    <strong>{application.petName || "Not Selected"}</strong>
                    <small>{application.petBreed || "Breed not available"}</small>
                </div>
            </div>

            <div className="admin-application-household">
                {household.map((item) => (
                    <span key={item}>{item}</span>
                ))}
            </div>

            <div className="admin-application-state">
                <span className={`admin-status-pill ${status}`}>
                    {statusLabel}
                </span>

                <small>
                    {status === "interview_scheduled" && application.interviewSchedule
                        ? `Interview ${formatShortDate(application.interviewSchedule, true)}`
                        : `Applied ${formatShortDate(application.createdAt)}`}
                </small>
            </div>

            <div className="admin-application-status">
                <button
                    type="button"
                    onClick={() => onReview(application)}
                >
                    Review
                </button>

                {status === "pending" && (
                    <>
                        <button
                            type="button"
                            className="approve"
                            onClick={() => onSchedule(application)}
                            disabled={busy}
                        >
                            Schedule Interview
                        </button>

                        <button
                            type="button"
                            className="reject"
                            onClick={() => onReject(application)}
                            disabled={busy}
                        >
                            Reject
                        </button>
                    </>
                )}

                {status === "interview_scheduled" && (
                    <>
                        <button
                            type="button"
                            className="secondary"
                            onClick={() => onSchedule(application)}
                            disabled={busy}
                        >
                            Reschedule
                        </button>

                        <button
                            type="button"
                            className="approve"
                            onClick={() => onCompleteInterview(application)}
                            disabled={busy}
                        >
                            Mark Completed
                        </button>

                        <button
                            type="button"
                            className="reject"
                            onClick={() => onReject(application)}
                            disabled={busy}
                        >
                            Reject
                        </button>
                    </>
                )}

                {status === "interview_completed" && (
                    <>
                        <button
                            type="button"
                            className="approve"
                            onClick={() => onApprove(application)}
                            disabled={busy}
                        >
                            Approve Adoption
                        </button>

                        <button
                            type="button"
                            className="reject"
                            onClick={() => onReject(application)}
                            disabled={busy}
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
                <button
                    className="admin-modal-class"
                    type="button"
                    onClick={onClose}
                >
                    x
                </button>

                <h2>Application Details</h2>

                <div className="admin-detail-grid">
                    <p>
                        <strong>Status:</strong>{" "}
                        {String(application.status || "pending").replaceAll(
                            "_",
                            " "
                        )}
                    </p>

                    <p>
                        <strong>Name:</strong> {application.fullName}
                    </p>

                    <p>
                        <strong>Email:</strong> {application.email}
                    </p>

                    <p>
                        <strong>Phone:</strong> {application.phone || "N/A"}
                    </p>

                    <p>
                        <strong>Address:</strong>{" "}
                        {application.address || "N/A"}
                    </p>

                    <p>
                        <strong>Pet Name:</strong>{" "}
                        {application.petName || "Not selected"}
                    </p>

                    <p>
                        <strong>Pet Breed:</strong>{" "}
                        {application.petBreed || "N/A"}
                    </p>

                    <p>
                        <strong>Home Type:</strong>{" "}
                        {application.homeType || "N/A"}
                    </p>

                    <p>
                        <strong>Has Children:</strong>{" "}
                        {application.hasChildren || "N/A"}
                    </p>

                    <p>
                        <strong>Other Pets:</strong>{" "}
                        {application.hasOtherPets || "N/A"}
                    </p>

                    <p>
                        <strong>Documents Verified:</strong>{" "}
                        {application.documentsVerified ? "Yes" : "No"}
                    </p>

                    <p>
                        <strong>Interview Schedule:</strong>{" "}
                        {formatDate(application.interviewSchedule)}
                    </p>

                    {application.reviewedByName && (
                        <p>
                            <strong>Reviewed By:</strong>{" "}
                            {application.reviewedByName}
                        </p>
                    )}

                    {application.reviewedAt && (
                        <p>
                            <strong>Reviewed At:</strong>{" "}
                            {formatDate(application.reviewedAt)}
                        </p>
                    )}
                </div>

                <div className="admin-detail-box">
                    <h3>Reason for Adoption</h3>
                    <p>{application.reason || "No reason provided."}</p>
                </div>

                <div className="admin-detail-box">
                    <h3>Pet Care Experience</h3>
                    <p>
                        {application.experience || "No experience provided."}
                    </p>
                </div>

                {Array.isArray(application.documents) &&
                    application.documents.length > 0 && (
                        <div className="admin-detail-box">
                            <h3>Submitted Documents</h3>

                            {application.documents.map((document, index) => (
                                <p key={document._id || index}>
                                    <strong>
                                        {document.documentName ||
                                            "Unnamed document"}
                                    </strong>
                                    {" — "}
                                    {document.status || "pending"}

                                    {document.documentUrl && (
                                        <>
                                            {" · "}
                                            <a
                                                href={document.documentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                View document
                                            </a>
                                        </>
                                    )}
                                </p>
                            ))}
                        </div>
                    )}

                {application.reviewNotes && (
                    <div className="admin-detail-box">
                        <h3>
                            {application.status === "rejected"
                                ? "Rejection Reason"
                                : "Review Notes"}
                        </h3>

                        <p>{application.reviewNotes}</p>
                    </div>
                )}
            </section>
        </div>
    );
}

export default function AdoptionApplications() {
    const [applications, setApplications] = useState([]);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [rejectionApplication, setRejectionApplication] = useState(null);
    const [interviewApplication, setInterviewApplication] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busyApplicationId, setBusyApplicationId] = useState(null);

    const token = localStorage.getItem("token");

    const activeApplications = useMemo(
        () =>
            applications.filter((application) =>
                ACTIVE_STATUSES.includes(
                    String(application.status || "pending").toLowerCase()
                )
            ),
        [applications]
    );

    const [activeTab, setActiveTab] = useState("active");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("newest");

    const historyApplications = useMemo(
        () =>
            applications.filter(
                (application) =>
                    !ACTIVE_STATUSES.includes(
                        String(application.status || "pending").toLowerCase()
                    )
            ),
        [applications]
    );

    const visibleApplications = useMemo(() => {
        const source =
            activeTab === "active" ? activeApplications : historyApplications;

        const query = searchTerm.trim().toLowerCase();

        return source
            .filter((application) => {
                const status = String(application.status || "pending").toLowerCase();

                if (statusFilter === "all") return true;
                if (statusFilter === "interview") return status.startsWith("interview");
                return status === statusFilter;
            })
            .filter((application) => {
                if (!query) return true;

                return [
                    application.fullName,
                    application.email,
                    application.petName,
                ].some((value) =>
                    String(value || "").toLowerCase().includes(query)
                );
            })
            .sort((a, b) => {
                const difference = new Date(b.createdAt) - new Date(a.createdAt);
                return sortOrder === "newest" ? difference : -difference;
            });
    }, [
        activeTab,
        activeApplications,
        historyApplications,
        searchTerm,
        statusFilter,
        sortOrder,
    ]);

    function switchTab(tab) {
        setActiveTab(tab);
        setStatusFilter("all");
    }

    const pendingCount = useMemo(
        () =>
            activeApplications.filter(
                (application) =>
                    String(application.status).toLowerCase() === "pending"
            ).length,
        [activeApplications]
    );

    const interviewCount = useMemo(
        () =>
            activeApplications.filter((application) =>
                [
                    "interview_scheduled",
                    "interview_completed",
                ].includes(String(application.status).toLowerCase())
            ).length,
        [activeApplications]
    );

    async function fetchApplications() {
        try {
            setLoading(true);

            const response = await fetch(`${API}/api/adoptions`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Failed to fetch adoption applications."
                );
            }

            setApplications(
                Array.isArray(data.applications) ? data.applications : []
            );
        } catch (error) {
            console.error("Fetch applications error:", error);
            alert(error.message || "Unable to load adoption applications.");
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateStatus(
        id,
        status,
        reviewNotes = "",
        interviewSchedule = null
    ) {
        try {
            setSaving(true);
            setBusyApplicationId(id);

            const body = {
                status,
                reviewNotes,
            };

            if (status === "interview_scheduled") {
                body.interviewSchedule = interviewSchedule;
            }

            const response = await fetch(
                `${API}/api/adoptions/${id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Failed to update application status."
                );
            }

            setRejectionApplication(null);
            setInterviewApplication(null);
            setSelectedApplication(null);

            await fetchApplications();

            return true;
        } catch (error) {
            console.error("Update status error:", error);
            alert(error.message || "Server error while updating application.");
            return false;
        } finally {
            setSaving(false);
            setBusyApplicationId(null);
        }
    }

    async function handleRejectApplication(id, reason) {
        return handleUpdateStatus(id, "rejected", reason);
    }

    async function handleScheduleInterview(id, interviewSchedule) {
        return handleUpdateStatus(
            id,
            "interview_scheduled",
            "",
            interviewSchedule
        );
    }

    async function handleCompleteInterview(application) {
        const confirmed = window.confirm(
            `Mark the interview for ${application.fullName} as completed?`
        );

        if (!confirmed) return;

        await handleUpdateStatus(
            application._id,
            "interview_completed"
        );
    }

    async function handleApproveApplication(application) {
        const confirmed = window.confirm(
            `Approve the adoption of ${application.petName} by ` +
                `${application.fullName}? This will mark the pet as adopted ` +
                "and close other active applications."
        );

        if (!confirmed) return;

        await handleUpdateStatus(application._id, "approved");
    }

    useEffect(() => {
        fetchApplications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <section className="admin-adoption-page">
            <section className="admin-panel admin-adoption-summary">
                <article>
                    <span>Total Applications</span>
                    <strong>{applications.length}</strong>
                </article>

                <article>
                    <span>Pending Review</span>
                    <strong>{pendingCount}</strong>
                </article>

                <article>
                    <span>Interview Stage</span>
                    <strong>{interviewCount}</strong>
                </article>
            </section>

            <section className="admin-panel admin-adoption-list-panel">
                <div className="admin-adoption-tabs" role="tablist">
                    {[
                        { key: "active", label: "Active", count: activeApplications.length },
                        { key: "history", label: "History", count: historyApplications.length },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            className={activeTab === tab.key ? "is-active" : ""}
                            onClick={() => switchTab(tab.key)}
                        >
                            {tab.label}
                            <span>{tab.count}</span>
                        </button>
                    ))}

                    <button
                        type="button"
                        className="admin-adoption-refresh"
                        onClick={fetchApplications}
                        disabled={loading || saving}
                    >
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                <div className="admin-adoption-toolbar">
                    <label className="admin-adoption-search">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                        </svg>

                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search applicant, email or pet…"
                            aria-label="Search applications"
                        />
                    </label>

                    <div className="admin-adoption-filters">
                        {FILTER_OPTIONS[activeTab].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={statusFilter === option.value ? "is-active" : ""}
                                onClick={() => setStatusFilter(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <select
                        className="admin-adoption-sort"
                        value={sortOrder}
                        onChange={(event) => setSortOrder(event.target.value)}
                        aria-label="Sort applications"
                    >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                    </select>
                </div>

                {loading ? (
                    <p className="admin-empty">Loading applications...</p>
                ) : visibleApplications.length === 0 ? (
                    <p className="admin-empty">
                        {searchTerm || statusFilter !== "all"
                            ? "No applications match your search or filter."
                            : activeTab === "active"
                                ? "There are no active adoption applications."
                                : "No closed applications yet."}
                    </p>
                ) : (
                    <>
                        <div className="admin-application-columns" aria-hidden="true">
                            <span>Applicant</span>
                            <span>Pet</span>
                            <span>Household</span>
                            <span>Status</span>
                            <span>Actions</span>
                        </div>

                        <div className="admin-application-list">
                            {visibleApplications.map((application) => (
                                <ApplicationRow
                                    key={application._id}
                                    application={application}
                                    onReview={setSelectedApplication}
                                    onSchedule={setInterviewApplication}
                                    onCompleteInterview={handleCompleteInterview}
                                    onApprove={handleApproveApplication}
                                    onReject={setRejectionApplication}
                                    busy={
                                        saving &&
                                        busyApplicationId === application._id
                                    }
                                />
                            ))}
                        </div>
                    </>
                )}
            </section>

            <ApplicationModal
                application={selectedApplication}
                onClose={() => setSelectedApplication(null)}
            />

            <InterviewModal
                application={interviewApplication}
                onClose={() => setInterviewApplication(null)}
                onConfirm={handleScheduleInterview}
                loading={saving}
            />

            <RejectModal
                application={rejectionApplication}
                onClose={() => setRejectionApplication(null)}
                onConfirm={handleRejectApplication}
                loading={saving}
            />
        </section>
    );
}
