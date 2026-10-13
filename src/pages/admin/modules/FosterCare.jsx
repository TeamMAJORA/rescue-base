import {
    useEffect, useState
} from "react"

const API = import.meta.env.VITE_BACKEND_URL;


// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

const emptyAssignmentForm = {
    fosterApplicationId: "",
    fosterName: "",
    fosterEmail: "",
    petName: "",
    petBreed: "",
    petImage: "",
    careInstructions: "",
};


// Icons reused from the Animal pages (IntakeRecords / AnimalProfiles)
const STAT_ICONS = {
    check: <path d="M20 6 9 17l-5-5" />,
    home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    heart: <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />,

    // reused from IntakeRecords / BehaviorAssessment
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
        </>
    ),
    paw: (
        <>
            <circle cx="11" cy="4" r="2" />
            <circle cx="18" cy="8" r="2" />
            <circle cx="4" cy="8" r="2" />
            <path d="M8 14c0-2 2-4 4-4s4 2 4 4-1 6-4 6-4-4-4-6z" />
        </>
    ),
    // new: no trash icon exists in the project yet
    trash: (
        <>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
        </>
    ),
};

function StatIcon({ name, size = 15 }) {
    return (
        <svg
            className="ao-icon"
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
            {STAT_ICONS[name]}
        </svg>
    );
}
export default function FosterCare() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [medicalRequests, setMedicalRequests] = useState([]);
    const [listFilter, setListFilter] = useState("all");
    const [listSearch, setListSearch] = useState("");
    const token = localStorage.getItem("token")

    const [assignmentForm, setAssignmentForm] =
        useState(emptyAssignmentForm);
    const [applications, setApplications] = useState([]);

    async function fetchAssignments() {
        try {
            setLoading(true);

            const response = await fetch(`${API}/api/foster/assignments`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await response.json();

            console.log("Foster assignments:", data);

            console.table(
                (data.assignments || []).map((assignment) => ({
                    id: assignment._id,
                    petName: assignment.petName,
                    fosterEmail: assignment.fosterEmail,
                    status: assignment.status,
                }))
            );

            if (data.success) {
                setAssignments(data.assignments || []);
            }
        } catch (error) {
            console.error("Fetch foster assignments error:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchFosterApplications() {
        try {
            const response = await fetch(`${API}/api/foster/applications`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await response.json();

            console.log("Foster applications:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to fetch foster applications.");
                return;
            }

            setApplications(data.applications || []);
        } catch (error) {
            console.error("Fetch foster applications error:", error);
            setMessage("Server error while fetching foster applications.");
        }
    }

    async function handleReviewFosterApplication(applicationId, status) {
        try {
            setMessage("");

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const application = applications.find(
                (item) => item._id === applicationId
            );

            const response = await fetch(
                `${API}/api/foster/applications/${applicationId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status,
                        adminName: savedUser.name || savedUser.username || "Admin User",
                        adminEmail: savedUser.email || "admin",
                        reviewNotes:
                            status === "approved"
                                ? "Approved for foster care."
                                : "Rejected foster application.",
                    }),
                }
            );

            const data = await response.json();

            console.log("Review foster application:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to review foster application.");
                return;
            }

            setMessage(`Foster application ${status}.`);

            await sendNotification({
                email: application.applicantEmail,
                title:
                    status === "approved"
                        ? "Application Approved"
                        : "Application Rejected",

                message:
                    status === "approved"
                        ? "Congratulations! Your foster application has been approved. You can now receive foster assignments."
                        : "Unfortunately, your foster application was not approved. Please contact the shelter for more information.",

                type: "application_update",
            });

            fetchFosterApplications();
        } catch (error) {
            console.error("Review foster application error:", error);
            setMessage("Server error while reviewing foster application.");
        }
    }

    async function handleCompleteAssignment(id) {
        try {
            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const response = await fetch(`${API}/api/foster/assignments/${id}/complete`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    adminName: savedUser.name || savedUser.username || "Admin User",
                    adminEmail: savedUser.email || "admin",
                }),
            });

            const data = await response.json();

            console.log("Complete foster assignment:", data);
            console.log("Returned status:", data.assignment?.status);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to complete assignment.");
                return;
            }

            setMessage("Foster assignment completed.");

            await sendNotification({
                email: data.assignment.fosterEmail,
                title: "Foster Assignment Completed",
                message: `Your foster assignment for ${data.assignment.petName} has been marked as completed. Thank you for helping RescueBase.`,
                type: "foster_update",
            });

            setAssignments((current) =>
                current.map((assignment) =>
                    assignment._id === id
                        ? { ...assignment, ...data.assignment }
                        : assignment
                )
            );

            fetchAssignments();
        } catch (error) {
            console.error("Complete foster assignment error:", error);
            setMessage("Server error while completing assignment.");
        }
    }

    async function handleAcceptBehaviorEvaluation(id) {
        try {
            setMessage("");

            const response = await fetch(
                `${API}/api/foster/assignments/${id}/behavior-evaluation/accept`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to accept behavioral evaluation");
                return;
            }

            setMessage("Behavioral evaluation accepted and foster assignment completed.");

            await sendNotification({
                email: data.assignment.fosterEmail,
                title: "Behavioral Evaluation Accepted",
                message: `Your behavioral evaluation for ${data.assignment.petName} has been reviewed and accepted. Your foster assignment has been completed.`,
                type: "foster_update",
            });

            await fetchAssignments();
        } catch (error) {
            console.error("Accept behavioral evaluation error:", error);
            setMessage("Server error while accepting behavioral evaluation");
        }
    }

    function handleApplicationSelect(e) {
        const applicationId = e.target.value;

        const application = applications.find(
            (item) => item._id === applicationId
        );

        if (!application) return;

        setAssignmentForm({
            ...assignmentForm,

            fosterApplicationId: application._id,
            fosterName: application.applicantName,
            fosterEmail: application.applicantEmail,
        });
    }

    function handleEditAssignment(assignment) {
        if (assignment.status !== "active") {
            setMessage(
                "Only active assignents can be edited."
            );
            return;
        }

        setEditingId(assignment._id);

        setAssignmentForm({

            fosterApplicationId:
                assignment.fosterApplicationId || "",

            fosterName:
                assignment.fosterName,

            fosterEmail:
                assignment.fosterEmail,

            petName:
                assignment.petName,

            petBreed:
                assignment.petBreed,

            petImage:
                assignment.petImage,

            careInstructions:
                assignment.careInstructions,
        });

        setMessage(
            "Editing assignment."
        );
    }

    function handleCancelEdit() {
        setEditingId(null);
        setAssignmentForm(emptyAssignmentForm);
        setMessage("");
    }

    async function handleDeleteAssignment(id) {
        const confirmDelete = await askConfirm({ title: "Delete this foster assignment?", message: "This can't be undone.", confirmLabel: "Delete", danger: true });

        if (!confirmDelete) return;

        try {
            setMessage("");

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const assignment = assignments.find(
                (item) => item._id === id
            )

            const response = await fetch(`${API}/api/foster/assignments/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    adminName: savedUser.name || savedUser.username || "Admin User",
                    adminEmail: savedUser.email || "admin",
                }),
            });

            const data = await response.json();
            console.log("Delete foster assignment:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to delete assignment.");
                return;
            }

            setMessage("Foster assignment deleted.");

            if (editingId === id) {
                handleCancelEdit();
            }

            await sendNotification({
                email: assignment.fosterEmail,
                title: "Assignment Cancelled",
                message: `Your foster assignment for ${assignment.petName} has been cancelled by the shelter.`,
                type: "foster_update",
            })

            fetchAssignments();
        } catch (error) {
            console.error("Delete foster assignment error:", error);
            setMessage("Server error while deleting assignment.");
        }
    }

    async function handleCreateAssignment(e) {
        e.preventDefault();

        try {
            setSubmitting(true);
            setMessage("");

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const response = await fetch(
                `${API}/api/foster/assignments`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ...assignmentForm,

                        adminName:
                            savedUser.name ||
                            savedUser.username,

                        adminEmail:
                            savedUser.email,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Failed to create assignment."
                );
                return;
            }

            setMessage("Foster assignment created");

            await sendNotification({
                email: assignmentForm.fosterEmail,
                title: "New Foster Assignment",
                message: `You have been assigned to foster ${assignmentForm.petName}. Please log in to RescueBase to review your assignment.`,
                type: "foster_update",
            });

            setAssignmentForm(emptyAssignmentForm);
            fetchAssignments();
            fetchFosterApplications();
        } catch (error) {
            console.error(error);

            setMessage("Server error while creating assignments.");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleUpdateAssignment(e) {
        e.preventDefault();

        try {
            setSubmitting(true);

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const response = await fetch(
                `${API}/api/foster/assignments/${editingId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ...assignmentForm,
                        adminName:
                            savedUser.name ||
                            savedUser.username,
                        adminEmail:
                            savedUser.email,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message);
                return;
            }

            setMessage("Assignment updated.");

            setEditingId(null);

            setAssignmentForm(emptyAssignmentForm);

            fetchAssignments();
        } catch (error) {
            console.error(error);
            setMessage("Server error.");
        } finally {
            setSubmitting(false);
        }
    }

    async function sendNotification({
        email,
        title,
        message,
        type = "general",
    }) {
        try {
            const response = await fetch(
                `${API}/api/notifications`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        email,
                        title,
                        message,
                        type,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error(
                    data.message ||
                    "Failed to create notification."
                );
            }
        } catch (error) {
            console.error(
                "Create notification error:",
                error
            );
        }
    }

    async function handleUpdateMedicalRequest(
        assignmentId,
        requestId,
        status
    ) {
        try {
            const response = await fetch(
                `${API}/api/foster/medical-requests/${assignmentId}/${requestId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ status }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message || "Failed to update medical request."
                );
                return;
            }

            setMessage("Medical request updated successfully.");
            fetchMedicalRequests();
        } catch (error) {
            console.error("Update medical request error:", error);
            setMessage("Something went wrong while updating the request.");
        }
    }

    async function fetchMedicalRequests() {
        try {
            const response = await fetch(
                `${API}/api/foster/medical-requests`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            console.log("Medical requests:", data);

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Failed to fetch medical requests."
                );
                return;
            }

            setMedicalRequests(data.requests || []);
        } catch (error) {
            console.error(
                "Fetch medical requests error:",
                error
            );
        }
    }

    useEffect(() => {
        fetchAssignments();
        fetchFosterApplications();
        fetchMedicalRequests();
    }, []);

    // ----- Current Foster Assignments list -----
    const LIST_FILTERS = [
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "completed", label: "Completed" },
    ];

    const PET_TINTS = ["is-orange", "is-plum", "is-sage", "is-sky"];

    const listQuery = listSearch.trim().toLowerCase();

    const visibleAssignments = assignments.filter((assignment) => {
        if (listFilter !== "all" && assignment.status !== listFilter) return false;
        if (!listQuery) return true;

        return [
            assignment.petName,
            assignment.petBreed,
            assignment.fosterName,
            assignment.fosterEmail,
        ].some((value) => String(value || "").toLowerCase().includes(listQuery));
    });

    function formatShortDate(value) {
        if (!value) return "—";
        return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    // ----- Stats strip numbers -----
    const pendingApplications = applications.filter(
        (application) => application.status === "pending"
    ).length;

    // One approved application per foster (keep the latest)
    const approvedByEmail = new Map();
    applications
        .filter((application) => application.status === "approved")
        .forEach((application) => {
            if (!approvedByEmail.has(application.applicantEmail)) {
                approvedByEmail.set(application.applicantEmail, application);
            }
        });

    const approvedFosters = approvedByEmail.size;

    const totalSlots = [...approvedByEmail.values()].reduce(
        (sum, application) => sum + (Number(application.capacity) || 1),
        0
    );

    const activeAssignments = assignments.filter(
        (assignment) => assignment.status === "active"
    ).length;

    const openMedicalRequests = medicalRequests.filter(
        (request) => request.status !== "resolved"
    ).length;

    function scrollToApplications() {
        document
            .getElementById("foster-applications")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    return (
        <section className="admin-foster-page">
            {/* Stats strip — same design as the Animal pages (styles in IntakeRecords.css) */}
            <div className="ao-page">
                <div className="ao-strip">
                    <div className="ao-strip-cta">
                        <div>
                            <b>{pendingApplications}</b>
                            <small>
                                {pendingApplications === 1
                                    ? "Application to review"
                                    : "Applications to review"}
                            </small>
                        </div>

                        {pendingApplications > 0 && (
                            <button type="button" onClick={scrollToApplications}>
                                Review →
                            </button>
                        )}
                    </div>

                    <div className="ao-strip-item">
                        <div className="ao-strip-label">
                            <StatIcon name="check" />
                            Approved Fosters
                        </div>
                        <div className="ao-strip-value">
                            {approvedFosters}
                            <em>{totalSlots} {totalSlots === 1 ? "slot" : "slots"} total</em>
                        </div>
                    </div>

                    <div className="ao-strip-item">
                        <div className="ao-strip-label">
                            <StatIcon name="home" />
                            Active Assignments
                        </div>
                        <div className="ao-strip-value">
                            {activeAssignments}
                            <em>of {totalSlots} {totalSlots === 1 ? "slot" : "slots"}</em>
                        </div>
                    </div>

                    <div className={`ao-strip-item ${openMedicalRequests > 0 ? "is-alert" : ""}`}>
                        <div className="ao-strip-label">
                            <StatIcon name="heart" />
                            Medical Requests
                        </div>
                        <div className="ao-strip-value">
                            {openMedicalRequests}
                            <em>open</em>
                        </div>
                    </div>
                </div>
            </div>

            <section className="admin-panel admin-foster-list-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>
                            Current Foster Assignments
                            <span className="afl-count">{assignments.length}</span>
                        </h2>
                        <p>
                            Manage all active and completed foster assignments.
                        </p>
                    </div>

                    <button
                        type="button"
                        className={`afl-refresh ${loading ? "is-loading" : ""}`}
                        onClick={fetchAssignments}
                        disabled={loading}
                    >
                        <img src="/icons/Refresh cw.svg" alt="" />
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                <div className="afl-toolbar">
                    <label className="afl-search">
                        <StatIcon name="search" />
                        <input
                            type="search"
                            value={listSearch}
                            onChange={(event) => setListSearch(event.target.value)}
                            placeholder="Search pet or foster..."
                        />
                    </label>

                    <div className="afl-filters" role="tablist" aria-label="Filter assignments">
                        {LIST_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                type="button"
                                className={listFilter === filter.value ? "is-active" : ""}
                                onClick={() => setListFilter(filter.value)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && assignments.length === 0 ? (
                    <p className="admin-empty">Loading assignments...</p>
                ) : visibleAssignments.length === 0 ? (
                    <p className="admin-empty">
                        {assignments.length === 0
                            ? "No foster assignments found."
                            : "No assignments match your search."}
                    </p>
                ) : (
                    <div className="afl-table">
                        <div className="afl-head" aria-hidden="true">
                            <span>Pet</span>
                            <span>Foster</span>
                            <span>Started</span>
                            <span>Updates</span>
                            <span>Status</span>
                            <span className="afl-right">Actions</span>
                        </div>

                        {visibleAssignments.map((assignment, index) => (
                            <article className="afl-item" key={assignment._id}>
                                <div className="afl-row">
                                    <div className="afl-pet">
                                        <span className={`afl-avatar ${PET_TINTS[index % PET_TINTS.length]}`}>
                                            {assignment.petImage ? (
                                                <img src={assignment.petImage} alt="" />
                                            ) : (
                                                <StatIcon name="paw" size={24} />
                                            )}
                                        </span>
                                        <div>
                                            <b>{assignment.petName}</b>
                                            <small>{assignment.petBreed || "Unknown breed"}</small>
                                        </div>
                                    </div>

                                    <div className="afl-foster">
                                        <b>{assignment.fosterName}</b>
                                        <small>{assignment.fosterEmail}</small>
                                    </div>

                                    <span className="afl-cell" data-label="Started">
                                        {formatShortDate(assignment.startDate)}
                                    </span>

                                    <span className="afl-cell" data-label="Updates">
                                        {assignment.updates?.length || 0}
                                    </span>

                                    <div className="afl-cell" data-label="Status">
                                        <span className={`afl-status is-${assignment.status}`}>
                                            {assignment.status}
                                        </span>
                                        {assignment.behaviorEvaluation?.status === "pending" && (
                                            <span className="afl-flag">Evaluation to review</span>
                                        )}
                                    </div>

                                    <div className="afl-actions">
                                        {assignment.status === "active" ? (
                                            <>
                                                {assignment.behaviorEvaluation?.status === "accepted" && (
                                                    <button
                                                        type="button"
                                                        className="afl-icon-btn"
                                                        title="Mark completed"
                                                        aria-label={`Complete ${assignment.petName}'s assignment`}
                                                        onClick={() => handleCompleteAssignment(assignment._id)}
                                                    >
                                                        <StatIcon name="check" />
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="afl-icon-btn"
                                                    title="Edit"
                                                    aria-label={`Edit ${assignment.petName}'s assignment`}
                                                    onClick={() => handleEditAssignment(assignment)}
                                                >
                                                    <img src="/icons/edit.svg" alt="" />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="afl-icon-btn is-danger"
                                                    title="Delete"
                                                    aria-label={`Delete ${assignment.petName}'s assignment`}
                                                    onClick={() => handleDeleteAssignment(assignment._id)}
                                                >
                                                    <StatIcon name="trash" />
                                                </button>
                                            </>
                                        ) : (
                                            <span className="afl-muted">—</span>
                                        )}
                                    </div>
                                </div>

                                {assignment.behaviorEvaluation?.status === "pending" && (
                                    <div className="admin-foster-behavior-review">
                                        <div className="admin-foster-behavior-heading">
                                            <strong>Behavioral Evaluation</strong>
                                            <span>Pending Review</span>
                                        </div>

                                        <div className="admin-foster-behavior-grid">
                                            <div>
                                                <strong>Energy Level</strong>
                                                <span>{assignment.behaviorEvaluation.energyLevel}/5</span>
                                            </div>
                                            <div>
                                                <strong>Friendliness</strong>
                                                <span>{assignment.behaviorEvaluation.friendliness}/5</span>
                                            </div>
                                            <div>
                                                <strong>Human Sociability</strong>
                                                <span>{assignment.behaviorEvaluation.humanSociability}/5</span>
                                            </div>
                                            <div>
                                                <strong>Animal Sociability</strong>
                                                <span>{assignment.behaviorEvaluation.animalSociability}/5</span>
                                            </div>
                                            <div>
                                                <strong>Trainability</strong>
                                                <span>{assignment.behaviorEvaluation.trainability}/5</span>
                                            </div>
                                            <div>
                                                <strong>Anxiety Level</strong>
                                                <span>{assignment.behaviorEvaluation.anxietyLevel}/5</span>
                                            </div>
                                            <div>
                                                <strong>Aggression Level</strong>
                                                <span>{assignment.behaviorEvaluation.aggressionLevel}/5</span>
                                            </div>
                                            <div>
                                                <strong>Activity Level</strong>
                                                <span>{assignment.behaviorEvaluation.activityLevel}/5</span>
                                            </div>
                                        </div>

                                        {assignment.behaviorEvaluation.notes && (
                                            <div className="admin-foster-behavior-notes">
                                                <strong>Foster Notes</strong>
                                                <p>{assignment.behaviorEvaluation.notes}</p>
                                            </div>
                                        )}

                                        <div className="admin-foster-behavior-meta">
                                            <span>
                                                Submitted by:{" "}
                                                {assignment.behaviorEvaluation.submittedBy || assignment.fosterName}
                                            </span>

                                            {assignment.behaviorEvaluation.submittedAt && (
                                                <span>
                                                    Submitted:{" "}
                                                    {new Date(assignment.behaviorEvaluation.submittedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleAcceptBehaviorEvaluation(assignment._id)}
                                        >
                                            Accept Evaluation
                                        </button>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section id="foster-applications" className="admin-panel admin-foster-application-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Foster Applications</h2>
                        <p>Register and approve foster caregivers before assigning animals.</p>
                    </div>

                    <button type="button" onClick={fetchFosterApplications}>
                        Refresh Applications
                    </button>
                </div>

                <section className="admin-panel admin-foster-assignment-panel">

                    <div className="admin-panel-heading">
                        <div>
                            <h2>Create Foster Assignment</h2>
                            <p>
                                Assign an approved foster caregiver to a rescued animal.
                            </p>
                        </div>
                    </div>

                    <form
                        className="admin-foster-assignment-form"
                        onSubmit={handleCreateAssignment}
                    >

                        <label>
                            Approved Foster

                            <select
                                value={assignmentForm.fosterApplicationId}
                                onChange={handleApplicationSelect}
                                required
                            >

                                <option value="">
                                    Select Approved Foster
                                </option>

                                {applications
                                    .filter(
                                        (application) =>
                                            application.status === "approved"
                                    )
                                    .map((application) => (
                                        <option
                                            key={application._id}
                                            value={application._id}
                                        >
                                            {application.applicantName}
                                        </option>
                                    ))}

                            </select>
                        </label>

                        <label>
                            Foster Email

                            <input
                                value={assignmentForm.fosterEmail}
                                readOnly
                            />
                        </label>

                        <label>
                            Pet Name

                            <input
                                value={assignmentForm.petName}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        petName: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Breed

                            <input
                                value={assignmentForm.petBreed}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        petBreed: e.target.value,
                                    })
                                }
                            />
                        </label>

                        <label>
                            Pet Image URL

                            <input
                                value={assignmentForm.petImage}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        petImage: e.target.value,
                                    })
                                }
                            />
                        </label>

                        <label className="admin-foster-care-field">

                            Care Instructions

                            <textarea
                                rows="4"
                                value={assignmentForm.careInstructions}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        careInstructions: e.target.value,
                                    })
                                }
                            />

                        </label>

                        <button
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Assigning..."
                                : "Assign Foster"}
                        </button>

                    </form>

                </section>

                <div className="admin-foster-application-list">
                    {applications.length === 0 ? (
                        <p className="admin-empty">No foster applications found.</p>
                    ) : (
                        applications.map((application) => (
                            <article className="admin-foster-application-card" key={application._id}>
                                <div>
                                    <h3>{application.applicantName}</h3>
                                    <p>{application.applicantEmail}</p>
                                    <small>
                                        Capacity: {application.capacity} • Preferred: {application.preferredAnimalType}
                                    </small>
                                </div>

                                <strong className={`admin-foster-status ${application.status}`}>
                                    {application.status}
                                </strong>

                                <div className="admin-foster-application-actions">
                                    {application.status !== "approved" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleReviewFosterApplication(application._id, "approved")
                                            }
                                        >
                                            Approve
                                        </button>
                                    )}

                                    {application.status !== "rejected" && (
                                        <button
                                            type="button"
                                            className="reject"
                                            onClick={() =>
                                                handleReviewFosterApplication(application._id, "rejected")
                                            }
                                        >
                                            Reject
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {editingId && (

                <section className="admin-panel">

                    <div className="admin-panel-heading">

                        <h2>Edit Foster Assignment</h2>

                    </div>

                    <form
                        className="admin-foster-assignment-form"
                        onSubmit={handleUpdateAssignment}
                    >

                        <label>

                            Pet Name

                            <input
                                value={assignmentForm.petName}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        petName: e.target.value
                                    })
                                }
                            />

                        </label>

                        <label>

                            Breed

                            <input
                                value={assignmentForm.petBreed}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        petBreed: e.target.value
                                    })
                                }
                            />

                        </label>

                        <label>

                            Pet Image

                            <input
                                value={assignmentForm.petImage}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        petImage: e.target.value
                                    })
                                }
                            />

                        </label>

                        <label className="admin-foster-care-field">

                            Care Instructions

                            <textarea
                                rows="4"
                                value={assignmentForm.careInstructions}
                                onChange={(e) =>
                                    setAssignmentForm({
                                        ...assignmentForm,
                                        careInstructions: e.target.value
                                    })
                                }
                            />

                        </label>

                        <div className="admin-foster-actions">

                            <button type="submit">
                                Save Changes
                            </button>

                            <button
                                type="button"
                                onClick={handleCancelEdit}
                            >
                                Cancel
                            </button>

                        </div>

                    </form>

                </section>

            )}

            <section className="admin-panel admin-medical-requests-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Medical Assistance Requests</h2>
                        <p>
                            Review medical concerns submitted by foster caregivers.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchMedicalRequests}
                    >
                        Refresh Requests
                    </button>
                </div>

                {medicalRequests.length === 0 ? (
                    <p className="admin-empty">
                        No medical assistance requests found.
                    </p>
                ) : (
                    <div className="admin-medical-request-list">
                        {medicalRequests.map((request) => (
                            <article
                                className="admin-medical-request-card"
                                key={`${request.assignmentId}-${request._id}`}
                            >
                                <h3>{request.petName}</h3>

                                <p>
                                    <strong>Foster:</strong>{" "}
                                    {request.fosterName}
                                </p>

                                <p>
                                    <strong>Email:</strong>{" "}
                                    {request.fosterEmail}
                                </p>

                                <p>
                                    <strong>Issue:</strong>{" "}
                                    {request.issue}
                                </p>

                                <p>
                                    <strong>Urgency:</strong>{" "}
                                    {request.urgency}
                                </p>

                                <p>
                                    <strong>Status:</strong>{" "}
                                    {request.status}
                                </p>

                                <small>
                                    Submitted:{" "}
                                    {request.createdAt
                                        ? new Date(
                                            request.createdAt
                                        ).toLocaleString()
                                        : "Unknown"}
                                </small>

                                <div className="medical-request-actions">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleUpdateMedicalRequest(
                                                request.assignmentId,
                                                request._id,
                                                "in_progress"
                                            )
                                        }
                                        disabled={
                                            request.status === "in_progress" ||
                                            request.status === "resolved"
                                        }
                                    >
                                        In Progress
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleUpdateMedicalRequest(
                                                request.assignmentId,
                                                request._id,
                                                "resolved"
                                            )
                                        }
                                        disabled={
                                            request.status === "resolved"
                                        }
                                    >
                                        Mark Resolved
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}