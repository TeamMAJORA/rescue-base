import {
    useEffect,
    useMemo,
    useState
} from "react";


// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

const API = import.meta.env.VITE_BACKEND_URL;

const TYPE_LABELS = {
    rescue: "Rescue",
    transport: "Transport",
    emergency: "Emergency",
    follow_up: "Follow-up",
    other: "Other",
};

const PRIORITY_LABELS = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };

const STATUS_LABELS = {
    pending: "Pending",
    accepted: "Accepted",
    declined: "Declined",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
};

// "14:30" -> "2:30 PM"
function formatTime(value) {
    const [h, m] = String(value || "").split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

function currentUserId() {
    try {
        const user = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");
        return String(user._id || user.id || "");
    } catch {
        return "";
    }
}

function personLabel(person) {
    return person.name || person.username || person.email || "Unnamed";
}

const emptyForm = {
    volunteerId: "",
    animalId: "",
    assignmentType: "rescue",
    title: "",
    description: "",
    location: "",
    scheduledDate: "",
    scheduledTime: "",
    priority: "normal",
};

export default function RescueAssignments() {
    const [assignments, setAssignments] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [animals, setAnimals] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingVolunteers, setLoadingVolunteers] = useState(true);
    const [loadingAnimals, setLoadingAnimals] = useState(true);

    const [message, setMessage] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] =
        useState(emptyForm);

    const token =
        localStorage.getItem("token");

    function getAuthHeaders() {
        return {
            Authorization: `Bearer ${token}`,
        };
    }

    function getJsonHeaders() {
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        };
    }

    async function fetchAssignments() {
        try {
            setLoading(true);

            const response = await fetch(
                `${API}/api/rescue-assignments`,
                {
                    headers: getAuthHeaders(),
                }
            );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                setMessage(
                    data.message ||
                    "Failed to fetch rescue assignments."
                );
                return;
            }

            setAssignments(
                data.assignments || []
            );
        } catch (error) {
            console.error(
                "Fetch rescue assignments error:",
                error
            );

            setMessage(
                "Server error while fetching rescue assignments."
            );
        } finally {
            setLoading(false);
        }
    }

    async function fetchVolunteers() {
        try {
            setLoadingVolunteers(true);

            const response = await fetch(
                `${API}/api/users/volunteers?includeStaff=1`,
                {
                    headers: getAuthHeaders(),
                }
            );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                setMessage(
                    data.message ||
                    "Failed to fetch volunteers."
                );
                return;
            }

            setVolunteers(
                data.users ||
                data.volunteers ||
                []
            );
        } catch (error) {
            console.error(
                "Fetch volunteers error:",
                error
            );

            setMessage(
                "Server error while fetching volunteers."
            );
        } finally {
            setLoadingVolunteers(false);
        }
    }

    async function fetchAnimals() {
        try {
            setLoadingAnimals(true);

            const response = await fetch(
                `${API}/api/animals`,
                {
                    headers: getAuthHeaders(),
                }
            );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                setMessage(
                    data.message ||
                    "Failed to fetch animals."
                );
                return;
            }

            setAnimals(
                data.animals || []
            );
        } catch (error) {
            console.error(
                "Fetch animals error:",
                error
            );

            setMessage(
                "Server error while fetching animals."
            );
        } finally {
            setLoadingAnimals(false);
        }
    }

    function handleChange(e) {
        const {
            name,
            value
        } = e.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function handleEdit(assignment) {
        if (
            [
                "completed",
                "cancelled",
            ].includes(
                assignment.status
            )
        ) {
            setMessage(
                "Completed or cancelled assignments cannot be edited."
            );

            return;
        }

        let scheduledDate = "";

        if (assignment.scheduledDate) {
            const date =
                new Date(
                    assignment.scheduledDate
                );

            if (
                !Number.isNaN(
                    date.getTime()
                )
            ) {
                scheduledDate =
                    date
                        .toISOString()
                        .split("T")[0];
            }
        }

        setEditingId(
            assignment._id
        );

        setForm({
            volunteerId:
                assignment.volunteerId ||
                "",
            animalId:
                assignment.animalId ||
                "",
            assignmentType:
                assignment.assignmentType ||
                "rescue",
            title:
                assignment.title ||
                "",
            description:
                assignment.description ||
                "",
            location:
                assignment.location ||
                "",
            scheduledDate,
            scheduledTime:
                assignment.scheduledTime ||
                "",
            priority:
                assignment.priority ||
                "normal",
        });

        setMessage(
            "Editing rescue assignment."
        );
    }

    function handleCancelEdit() {
        setEditingId(null);
        setForm(emptyForm);
        setMessage("");
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.volunteerId) {
            setMessage(
                "Please select a volunteer."
            );
            return;
        }

        if (!form.title.trim()) {
            setMessage(
                "Assignment title is required."
            );
            return;
        }

        if (!form.description.trim()) {
            setMessage(
                "Assignment description is required."
            );
            return;
        }

        if (!form.location.trim()) {
            setMessage(
                "Assignment location is required."
            );
            return;
        }

        if (!form.scheduledDate) {
            setMessage(
                "Scheduled date is required."
            );
            return;
        }

        try {
            setSubmitting(true);
            setMessage("");

            const url = editingId
                ? `${API}/api/rescue-assignments/${editingId}`
                : `${API}/api/rescue-assignments`;

            const response =
                await fetch(
                    url,
                    {
                        method:
                            editingId
                                ? "PATCH"
                                : "POST",

                        headers:
                            getJsonHeaders(),

                        body:
                            JSON.stringify(
                                form
                            ),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                setMessage(
                    data.message ||
                    (
                        editingId
                            ? "Failed to update rescue assignment."
                            : "Failed to create rescue assignment."
                    )
                );

                return;
            }

            setMessage(
                editingId
                    ? "Rescue assignment updated successfully."
                    : "Rescue assignment created successfully."
            );

            setEditingId(null);
            setForm(emptyForm);

            await fetchAssignments();
        } catch (error) {
            console.error(
                "Save rescue assignment error:",
                error
            );

            setMessage(
                "Server error while saving rescue assignment."
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleCancelAssignment(
        id
    ) {
        const confirmed =
            await askConfirm({ title: "Cancel this rescue assignment?", confirmLabel: "Cancel assignment", cancelLabel: "Keep it", danger: true });

        if (!confirmed) {
            return;
        }

        try {
            setMessage("");

            const response =
                await fetch(
                    `${API}/api/rescue-assignments/${id}/cancel`,
                    {
                        method: "PATCH",
                        headers:
                            getJsonHeaders(),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                setMessage(
                    data.message ||
                    "Failed to cancel assignment."
                );

                return;
            }

            setMessage(
                "Rescue assignment cancelled."
            );

            if (
                editingId === id
            ) {
                handleCancelEdit();
            }

            await fetchAssignments();
        } catch (error) {
            console.error(
                "Cancel rescue assignment error:",
                error
            );

            setMessage(
                "Server error while cancelling assignment."
            );
        }
    }

    async function handleDeleteAssignment(
        id
    ) {
        const confirmed =
            await askConfirm({ title: "Delete this rescue assignment?", message: "This can't be undone.", confirmLabel: "Delete", danger: true });

        if (!confirmed) {
            return;
        }

        try {
            setMessage("");

            const response =
                await fetch(
                    `${API}/api/rescue-assignments/${id}`,
                    {
                        method: "DELETE",
                        headers:
                            getAuthHeaders(),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                setMessage(
                    data.message ||
                    "Failed to delete assignment."
                );

                return;
            }

            setMessage(
                "Rescue assignment deleted."
            );

            if (
                editingId === id
            ) {
                handleCancelEdit();
            }

            await fetchAssignments();
        } catch (error) {
            console.error(
                "Delete rescue assignment error:",
                error
            );

            setMessage(
                "Server error while deleting assignment."
            );
        }
    }



    function formatDate(
        dateValue
    ) {
        if (!dateValue) {
            return "Not scheduled";
        }

        const date =
            new Date(dateValue);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Invalid date";
        }

        return date.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "numeric",
            }
        );
    }


    useEffect(() => {
        fetchAssignments();
        fetchVolunteers();
        fetchAnimals();
    }, []);

    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [volunteerFilter, setVolunteerFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");

    const statusGroup = (status) =>
        status === "declined" || status === "cancelled" ? "closed" : status === "accepted" ? "active" : status || "pending";

    const counts = useMemo(() => {
        const result = { all: assignments.length, pending: 0, active: 0, completed: 0, closed: 0 };
        assignments.forEach((item) => {
            result[statusGroup(item.status)] += 1;
        });
        return result;
    }, [assignments]);

    const shown = useMemo(() => {
        const term = search.trim().toLowerCase();

        return assignments.filter((item) => {
            if (statusFilter !== "all" && statusGroup(item.status) !== statusFilter) return false;
            if (volunteerFilter && String(item.volunteerId || "") !== volunteerFilter) return false;
            if (priorityFilter && item.priority !== priorityFilter) return false;
            if (!term) return true;

            return [item.title, item.volunteerName, item.volunteerEmail, item.location, item.animalName]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term));
        });
    }, [assignments, statusFilter, volunteerFilter, priorityFilter, search]);

    const isError = /required|please|failed|cannot|error|unable|not found/i.test(message);

    const myId = currentUserId();

    const volunteerOptions = useMemo(
        () => ({
            volunteers: volunteers.filter((person) => person.role !== "staff"),
            staff: volunteers.filter((person) => person.role === "staff"),
        }),
        [volunteers]
    );

    const roleOf = (id) => volunteers.find((person) => String(person._id) === String(id))?.role;

    // Staff answering an assignment given to them (same steps a volunteer has)
    async function respondToAssignment(assignment, action) {
        let body = {};

        if (action === "decline") {
            const ok = await askConfirm({ title: `Decline "${assignment.title}"?`, confirmLabel: "Decline", danger: true });
            if (!ok) return;
        }
        if (action === "complete") {
            const ok = await askConfirm({ title: `Mark "${assignment.title}" as completed?`, confirmLabel: "Complete" });
            if (!ok) return;
            body = { completionNotes: "" };
        }

        try {
            const response = await fetch(`${API}/api/rescue-assignments/${assignment._id}/${action}`, {
                method: "PATCH",
                headers: getJsonHeaders(),
                body: JSON.stringify(body),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.success === false) {
                throw new Error(data.message || `Failed to ${action} assignment.`);
            }

            setMessage(
                { accept: "Assignment accepted.", decline: "Assignment declined.", start: "Assignment started.", complete: "Assignment completed." }[action]
            );
            await fetchAssignments();
        } catch (err) {
            setMessage(err.message || `Failed to ${action} assignment.`);
        }
    }

    return (
        <section className="rs2-page">
            <div className="um-strip rs2-strip">
                <div className="um-strip-total">
                    <b>{counts.all}</b>
                    <small>Total assignments</small>
                </div>
                <div>
                    <small>Waiting for reply</small>
                    <b>{counts.pending}</b>
                </div>
                <div>
                    <small>In progress</small>
                    <b>{counts.active}</b>
                </div>
                <div>
                    <small>Completed</small>
                    <b>{counts.completed}</b>
                </div>
            </div>

            {message && (
                <p className={`rs2-msg ${isError ? "is-error" : ""}`} role={isError ? "alert" : "status"}>
                    {message}
                </p>
            )}

            <div className="rs2-grid">
                {/* Create / edit */}
                <form className="rs2-card rs2-form" onSubmit={handleSubmit}>
                    <h3>{editingId ? "Edit assignment" : "New assignment"}</h3>
                    <p className="rs2-sub">
                        {editingId ? "Changes are sent to the assigned person." : "They get notified and can accept or decline."}
                    </p>

                    <label className="rs2-field">
                        <span>
                            Assign to <em>*</em>
                        </span>
                        <select name="volunteerId" value={form.volunteerId} onChange={handleChange} required disabled={loadingVolunteers}>
                            <option value="">{loadingVolunteers ? "Loading..." : "Select volunteer or staff"}</option>
                            {volunteerOptions.volunteers.length > 0 && (
                                <optgroup label="Volunteers">
                                    {volunteerOptions.volunteers.map((person) => (
                                        <option key={person._id} value={person._id}>
                                            {personLabel(person)}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {volunteerOptions.staff.length > 0 && (
                                <optgroup label="Staff">
                                    {volunteerOptions.staff.map((person) => (
                                        <option key={person._id} value={person._id}>
                                            {personLabel(person)}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </label>

                    <div className="rs2-two">
                        <label className="rs2-field">
                            <span>Type</span>
                            <select name="assignmentType" value={form.assignmentType} onChange={handleChange}>
                                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="rs2-field">
                            <span>Priority</span>
                            <select name="priority" value={form.priority} onChange={handleChange}>
                                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="rs2-field">
                        <span>
                            Title <em>*</em>
                        </span>
                        <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Rescue injured dog" maxLength={120} required />
                    </label>

                    <label className="rs2-field">
                        <span>
                            Location <em>*</em>
                        </span>
                        <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Gorordo Ave, Lahug" required />
                    </label>

                    <div className="rs2-two">
                        <label className="rs2-field">
                            <span>
                                Date <em>*</em>
                            </span>
                            <input type="date" name="scheduledDate" value={form.scheduledDate} onChange={handleChange} required />
                        </label>

                        <label className="rs2-field">
                            <span>Time</span>
                            <input type="time" name="scheduledTime" value={form.scheduledTime} onChange={handleChange} />
                        </label>
                    </div>

                    <label className="rs2-field">
                        <span>
                            Animal <small>(optional)</small>
                        </span>
                        <select name="animalId" value={form.animalId} onChange={handleChange} disabled={loadingAnimals}>
                            <option value="">{loadingAnimals ? "Loading animals..." : "None"}</option>
                            {animals.map((animal) => (
                                <option key={animal._id} value={animal._id}>
                                    {animal.name}
                                    {animal.type ? ` — ${animal.type}` : ""}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="rs2-field">
                        <span>
                            Description <em>*</em>
                        </span>
                        <textarea name="description" rows={3} value={form.description} onChange={handleChange} placeholder="What the volunteer needs to do..." required />
                    </label>

                    <button type="submit" className="rs2-submit" disabled={submitting}>
                        {submitting ? "Saving..." : editingId ? "Save changes" : "Create assignment"}
                    </button>

                    {editingId && (
                        <button type="button" className="rs2-link rs2-cancel-edit" onClick={handleCancelEdit}>
                            Cancel editing
                        </button>
                    )}
                </form>

                {/* List */}
                <section className="rs2-card">
                    <div className="rs2-head">
                        <h3>Assignments</h3>
                        <div className="rs2-chips">
                            {[
                                ["all", "All"],
                                ["pending", "Pending"],
                                ["active", "Active"],
                                ["completed", "Completed"],
                                ["closed", "Closed"],
                            ].map(([value, label]) => (
                                <button
                                    type="button"
                                    key={value}
                                    className={statusFilter === value ? "on" : ""}
                                    onClick={() => setStatusFilter(value)}
                                >
                                    {label}
                                    <em>{counts[value]}</em>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rs2-tools">
                        <label className="rs2-search">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                type="search"
                                value={search}
                                placeholder="Search title, person or location..."
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </label>

                        <select className="rs2-select" value={volunteerFilter} aria-label="Assigned to" onChange={(event) => setVolunteerFilter(event.target.value)}>
                            <option value="">Everyone</option>
                            {volunteers.map((person) => (
                                <option key={person._id} value={person._id}>
                                    {personLabel(person)}
                                    {person.role === "staff" ? " (Staff)" : ""}
                                </option>
                            ))}
                        </select>

                        <select className="rs2-select" value={priorityFilter} aria-label="Priority" onChange={(event) => setPriorityFilter(event.target.value)}>
                            <option value="">All priorities</option>
                            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <p className="rs2-empty">Loading assignments...</p>
                    ) : shown.length === 0 ? (
                        <p className="rs2-empty">
                            {assignments.length === 0 ? "No rescue assignments yet. Create one on the left." : "No assignments match your search or filters."}
                        </p>
                    ) : (
                        <div className="rs2-table-wrap">
                            <table className="rs2-table">
                                <thead>
                                    <tr>
                                        <th>Assignment</th>
                                        <th>Assigned to</th>
                                        <th>Location</th>
                                        <th>Scheduled</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th className="rs2-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shown.map((assignment) => {
                                        const status = assignment.status || "pending";
                                        const canEdit = !["completed", "cancelled"].includes(status);
                                        const canDelete = !["accepted", "active", "completed"].includes(status);
                                        const time = formatTime(assignment.scheduledTime);

                                        return (
                                            <tr key={assignment._id} className={editingId === assignment._id ? "is-editing" : ""}>
                                                <td>
                                                    <b>{assignment.title || "Untitled assignment"}</b>
                                                    <small>
                                                        {TYPE_LABELS[assignment.assignmentType] || "Rescue"}
                                                        {assignment.animalName ? ` · ${assignment.animalName}` : ""}
                                                    </small>
                                                </td>
                                                <td>
                                                    <b>
                                                        {assignment.volunteerName || "Unassigned"}
                                                        {String(assignment.volunteerId) === myId ? " (you)" : ""}
                                                    </b>
                                                    <small>{roleOf(assignment.volunteerId) === "staff" ? "Staff" : "Volunteer"}</small>
                                                </td>
                                                <td>{assignment.location || "—"}</td>
                                                <td className="rs2-nowrap">
                                                    {formatDate(assignment.scheduledDate)}
                                                    {time && <small>{time}</small>}
                                                </td>
                                                <td>
                                                    <span className={`rs2-priority is-${assignment.priority || "normal"}`}>
                                                        {PRIORITY_LABELS[assignment.priority] || "Normal"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`rs2-status is-${status}`}>{STATUS_LABELS[status] || status}</span>
                                                </td>
                                                <td>
                                                    <div className="rs2-actions">
                                                        {String(assignment.volunteerId) === myId && status === "pending" && (
                                                            <>
                                                                <button type="button" className="rs2-mini is-go" onClick={() => respondToAssignment(assignment, "accept")}>
                                                                    Accept
                                                                </button>
                                                                <button type="button" className="rs2-link is-warn" onClick={() => respondToAssignment(assignment, "decline")}>
                                                                    Decline
                                                                </button>
                                                            </>
                                                        )}
                                                        {String(assignment.volunteerId) === myId && status === "accepted" && (
                                                            <button type="button" className="rs2-mini is-go" onClick={() => respondToAssignment(assignment, "start")}>
                                                                Start
                                                            </button>
                                                        )}
                                                        {String(assignment.volunteerId) === myId && status === "active" && (
                                                            <button type="button" className="rs2-mini is-go" onClick={() => respondToAssignment(assignment, "complete")}>
                                                                Complete
                                                            </button>
                                                        )}
                                                        {canEdit && (
                                                            <button type="button" className="rs2-mini" onClick={() => handleEdit(assignment)}>
                                                                Edit
                                                            </button>
                                                        )}
                                                        {canEdit && status !== "declined" && (
                                                            <button type="button" className="rs2-link is-warn" onClick={() => handleCancelAssignment(assignment._id)}>
                                                                Cancel
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                type="button"
                                                                className="rs2-icon"
                                                                title="Delete"
                                                                aria-label={`Delete ${assignment.title || "assignment"}`}
                                                                onClick={() => handleDeleteAssignment(assignment._id)}
                                                            >
                                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                                                    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && assignments.length > 0 && (
                        <p className="rs2-foot">
                            Showing {shown.length} of {assignments.length}
                        </p>
                    )}
                </section>
            </div>
        </section>
    );
}
