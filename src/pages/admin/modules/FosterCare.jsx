import {
    useEffect, useState
} from "react"

const API = import.meta.env.VITE_BACKEND_URL;

const emptyFosterForm = {
    petName: "",
    petBreed: "",
    petImage: "",
    fosterName: "",
    fosterEmail: "",
    careInstructions: "",
}

const emptyApplicationForm = {
    applicantName: "",
    applicantEmail: "",
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
}

export default function FosterCare() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [fosterForm, setFosterForm] = useState(emptyFosterForm);
    const [applications, setApplications] = useState([]);
    const [applicationForm, setApplicationForm] = useState(emptyApplicationForm);

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

    async function handleSubmitFosterApplication(e) {
        e.preventDefault();

        try {
            setMessage("");

            const response = await fetch(`${API}/api/foster/applications`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...applicationForm,
                    capacity: Number(applicationForm.capacity || 1),
                }),
            });

            const data = await response.json();

            console.log("Create foster application:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to submit foster application.");
                return;
            }

            setMessage("Foster application submitted.");
            setApplicationForm(emptyApplicationForm);
            fetchFosterApplications();
        } catch (error) {
            console.error("Submit foster application error:", error);
            setMessage("Server error while submitting foster application.");
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

    function handleEditAssignment(assignment) {
        if (assignment.status !== "active") {
            setMessage("Only in-progress assignments can be updated.");
            return;
        }

        setEditingId(assignment._id);

        setFosterForm({
            petName: assignment.petName || "",
            petBreed: assignment.petBreed || "",
            petImage: assignment.petImage || "",
            fosterName: assignment.fosterName || "",
            fosterEmail: assignment.fosterEmail || "",
            careInstructions: assignment.careInstructions || "",
        });

        setMessage("Editing in-progress foster assignment.");
    }

    function handleCancelEdit() {
        setEditingId(null);
        setFosterForm(emptyFosterForm);
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

                <form className="admin-foster-application-form" onSubmit={handleSubmitFosterApplication}>
                    <label>
                        Applicant Name
                        <input
                            value={applicationForm.applicantName}
                            onChange={(e) =>
                                setApplicationForm({
                                    ...applicationForm,
                                    applicantName: e.target.value,
                                })
                            }
                            required
                        />
                    </label>

                    <label>
                        Applicant Email
                        <input
                            type="email"
                            value={applicationForm.applicantEmail}
                            onChange={(e) =>
                                setApplicationForm({
                                    ...applicationForm,
                                    applicantEmail: e.target.value,
                                })
                            }
                            required
                        />
                    </label>

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
                        />
                    </label>

                    <label className="admin-foster-care-field">
                        Foster Experience
                        <textarea
                            value={applicationForm.fosterExperience}
                            onChange={(e) =>
                                setApplicationForm({
                                    ...applicationForm,
                                    fosterExperience: e.target.value,
                                })
                            }
                            placeholder="Describe foster experience or beginner status."
                        />
                    </label>

                    <label className="admin-foster-check">
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

                    <label className="admin-foster-check">
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

                    <button type="submit">
                        Submit Foster Application
                    </button>
                </form>

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

            <section className="admin-panel admin-foster-list-panel">
                <div className="admin-panel-heading">
                    <h2>Foster Assignments</h2>

                    <button type="button" onClick={fetchAssignments}>
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <p className="admin-empty">Loading foster assignments...</p>
                ) : assignments.length === 0 ? (
                    <p className="admin-empty">No foster assignments yet.</p>
                ) : (
                    <div className="admin-foster-list">
                        {assignments.map((assignment) => (
                            <article className="admin-foster-row" key={assignment._id}>
                                <div>
                                    <h3>{assignment.petName}</h3>
                                    <p>
                                        {assignment.petBreed || "Unknown breed"} •{" "}
                                        {assignment.fosterName}
                                    </p>
                                    <small>{assignment.fosterEmail}</small>
                                    <span>{assignment.careInstructions}</span>
                                </div>

                                <div className="admin-foster-actions">
                                    <strong>{assignment.status}</strong>

                                    {assignment.status === "active" && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleEditAssignment(assignment)}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleCompleteAssignment(assignment._id)}
                                            >
                                                Complete
                                            </button>

                                            <button
                                                type="button"
                                                className="delete"
                                                onClick={() => handleDeleteAssignment(assignment._id)}
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