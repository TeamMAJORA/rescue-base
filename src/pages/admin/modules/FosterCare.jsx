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

export default function FosterCare() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [fosterForm, setFosterForm] = useState(emptyFosterForm);

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

    async function handleSubmitFosterAssignment(e) {
        e.preventDefault();

        try {
            setSubmitting(true);
            setMessage("");

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const endpoint = editingId
                ? `${API}/api/foster/assignments/${editingId}`
                : `${API}/api/foster/assignments`;

            const method = editingId ? "PATCH" : "POST";

            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...fosterForm,
                    adminName: savedUser.name || savedUser.username || "Admin User",
                    adminEmail: savedUser.email || "admin",
                }),
            });

            const data = await response.json();
            console.log("Save foster assignment:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to save foster assignment.");
                return;
            }

            setMessage(
                editingId
                    ? "Foster assignment updated."
                    : "Foster assignment created."
            );

            setFosterForm(emptyFosterForm);
            setEditingId(null);
            fetchAssignments();
        } catch (error) {
            console.error("Save foster assignment error:", error);
            setMessage("Server error. Please try again.");
        } finally {
            setSubmitting(false);
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
    }, []);

    return (
        <section className="admin-foster-page">
            <section className="admin-panel admin-foster-form-panel">
                <div className="admin-panel-heading">
                    <h2>{editingId ? "Update Foster Assignment" : "Create Foster Assignment"}</h2>

                    {editingId && (
                        <button type="button" onClick={handleCancelEdit}>
                            Cancel Edit
                        </button>
                    )}

                </div>

                <form className="admin-foster-form" onSubmit={handleSubmitFosterAssignment}>
                    <label>
                        Pet Name
                        <input
                            type="text"
                            value={fosterForm.petName}
                            onChange={(e) =>
                                setFosterForm({ ...fosterForm, petName: e.target.value })
                            }
                            required
                        />
                    </label>

                    <label>
                        Pet Breed
                        <input
                            type="text"
                            value={fosterForm.petBreed}
                            onChange={(e) =>
                                setFosterForm({ ...fosterForm, petBreed: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Pet Image URL
                        <input
                            type="text"
                            value={fosterForm.petImage}
                            onChange={(e) =>
                                setFosterForm({ ...fosterForm, petImage: e.target.value })
                            }
                            placeholder="Optional"
                        />
                    </label>

                    <label>
                        Foster Name
                        <input
                            type="text"
                            value={fosterForm.fosterName}
                            onChange={(e) =>
                                setFosterForm({ ...fosterForm, fosterName: e.target.value })
                            }
                            required
                        />
                    </label>

                    <label>
                        Foster Gmail
                        <input
                            type="email"
                            value={fosterForm.fosterEmail}
                            onChange={(e) =>
                                setFosterForm({ ...fosterForm, fosterEmail: e.target.value })
                            }
                            required
                        />
                    </label>

                    <label className="admin-foster-care-field">
                        Care Instructions
                        <textarea
                            value={fosterForm.careInstructions}
                            onChange={(e) =>
                                setFosterForm({
                                    ...fosterForm,
                                    careInstructions: e.target.value,
                                })
                            }
                            placeholder="Example: Feed twice a day and submit weekly updates."
                            required
                        />
                    </label>

                    {message && <p className="admin-foster-message">{message}</p>}

                    <button type="submit" disabled={submitting}>
                        {submitting
                            ? "Saving..."
                            : editingId
                                ? "Update Assignment"
                                : "Assign Foster"}
                    </button>
                </form>
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