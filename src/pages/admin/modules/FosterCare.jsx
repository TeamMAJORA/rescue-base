import {
    useEffect, useState
} from "react"

const API = import.meta.env.VITE_BACKEND_URL;

const emptyAssignmentForm = {
    fosterApplicationId: "",
    fosterName: "",
    fosterEmail: "",
    petName: "",
    petBreed: "",
    petImage: "",
    careInstructions: "",
};



export default function FosterCare() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [assignmentForm, setAssignmentForm] =
        useState(emptyAssignmentForm);
    const [applications, setApplications] = useState([]);

    async function fetchAssignments() {
        try {
            setLoading(true);

            const response = await fetch(`${API}/api/foster/assignments`);
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
            const response = await fetch(`${API}/api/foster/applications`);
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

            const response = await fetch(
                `${API}/api/foster/applications/${applicationId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
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
        const confirmDelete = window.confirm(
            "Delete this in-progress foster assignment?"
        );

        if (!confirmDelete) return;

        try {
            setMessage("");

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const response = await fetch(`${API}/api/foster/assignments/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
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

    useEffect(() => {
        fetchAssignments();
        fetchFosterApplications();
    }, []);

    return (
        <section className="admin-foster-page">
            <section className="admin-panel admin-foster-application-panel">
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

            <section className="admin-panel admin-foster-list-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Current Foster Assignments</h2>
                        <p>
                            Manage all active and completed foster assignments.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={fetchAssignments}
                    >
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <p className="admin-empty">
                        Loading assignments...
                    </p>
                ) : assignments.length === 0 ? (
                    <p className="admin-empty">
                        No foster assignments found.
                    </p>
                ) : (

                    <div className="admin-foster-list">
                        {assignments.map((assignment) => (
                            <article
                                className="admin-foster-row"
                                key={assignment._id}
                            >

                                <div className="admin-foster-pet">
                                    <img
                                        src={
                                            assignment.petImage ||
                                            "https://placehold.co/120x120?text=Pet"
                                        }
                                        alt={assignment.petName}
                                    />
                                </div>

                                <div className="admin-foster-details">

                                    <h3>{assignment.petName}</h3>

                                    <p>
                                        <strong>Breed:</strong>{" "}
                                        {assignment.petBreed || "Unknown"}
                                    </p>

                                    <p>
                                        <strong>Foster:</strong>{" "}
                                        {assignment.fosterName}
                                    </p>

                                    <p>
                                        <strong>Email:</strong>{" "}
                                        {assignment.fosterEmail}
                                    </p>

                                    <p>
                                        <strong>Started:</strong>{" "}
                                        {new Date(
                                            assignment.startDate
                                        ).toLocaleDateString()}
                                    </p>

                                    <p>
                                        <strong>Updates:</strong>{" "}
                                        {assignment.updates?.length || 0}
                                    </p>
                                    <small>
                                        {assignment.careInstructions}
                                    </small>
                                </div>

                                <div className="admin-foster-actions">

                                    <span
                                        className={`admin-foster-status ${assignment.status}`}
                                    >
                                        {assignment.status}
                                    </span>

                                    {assignment.status === "active" && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleEditAssignment(
                                                        assignment
                                                    )
                                                }
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleCompleteAssignment(
                                                        assignment._id
                                                    )
                                                }
                                            >
                                                Complete
                                            </button>

                                            <button
                                                type="button"
                                                className="delete"
                                                onClick={() =>
                                                    handleDeleteAssignment(
                                                        assignment._id
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}