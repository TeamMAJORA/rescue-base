import {
    useEffect, useState
} from "react"

const API = import.meta.env.VITE_BACKEND_URL;

export default function FosterCare() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const [fosterForm, setFosterForm] = useState({
        petName: "",
        petBreed: "",
        petImage: "",
        fosterName: "",
        fosterEmail: "",
        careInstructions: "",
    });

    async function fetchAssignments() {
        try {
            setLoading(true);

            const response = await fetch(`${API}/api/foster/assignments`);
            const data = await response.json();

            console.log("Foster assignments:", data);

            if (data.success) {
                setAssignments(data.assignments || []);
            }
        } catch (error) {
            console.error("Fetch foster assignments error:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateFosterAssignment(e) {
        e.preventDefault();

        try {
            setMessage("");

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const response = await fetch(`${API}/api/foster/assignments`, {
                method: "POST",
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
            console.log("Create foster assignment:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to create foster assignment.");
                return;
            }

            setMessage("Foster assignment created.");

            setFosterForm({
                petName: "",
                petBreed: "",
                petImage: "",
                fosterName: "",
                fosterEmail: "",
                careInstructions: "",
            });

            fetchAssignments();
        } catch (error) {
            console.error("Create foster assignment error:", error);
            setMessage("Server error. Please try again.");
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

            if (data.success) {
                fetchAssignments();
            }
        } catch (error) {
            console.error("Complete foster assignment error:", error);
        }
    }

    useEffect(() => {
        fetchAssignments();
    }, []);

    return (
        <section className="admin-foster-page">
            <section className="admin-panel admin-foster-form-panel">
                <div className="admin-panel-heading">
                    <h2>Create Foster Assignment</h2>
                </div>

                <form className="admin-foster-form" onSubmit={handleCreateFosterAssignment}>
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

                    <button type="submit">Assign Foster</button>
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
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCompleteAssignment(assignment._id)
                                            }
                                        >
                                            Complete
                                        </button>
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