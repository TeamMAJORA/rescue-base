import {
    useEffect,
    useState
} from "react";

const API = import.meta.env.VITE_BACKEND_URL;

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
                `${API}/api/users?role=volunteer`,
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
            window.confirm(
                "Cancel this rescue assignment?"
            );

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
            window.confirm(
                "Delete this rescue assignment?"
            );

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

    function getStatusClass(
        status
    ) {
        return `admin-rescue-status ${status || ""}`;
    }

    function getPriorityClass(
        priority
    ) {
        return `admin-rescue-priority ${priority || "normal"}`;
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

    function formatCreatedAt(
        dateValue
    ) {
        if (!dateValue) {
            return "";
        }

        const date =
            new Date(dateValue);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "";
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

    return (
        <section className="admin-rescue-page">

            <section className="admin-panel admin-rescue-create-panel">

                <div className="admin-panel-heading">

                    <div>
                        <h2>
                            {editingId
                                ? "Edit Rescue Assignment"
                                : "Create Rescue Assignment"}
                        </h2>

                        <p>
                            Assign rescue tasks to
                            registered volunteers.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            fetchAssignments();
                            fetchVolunteers();
                            fetchAnimals();
                        }}
                    >
                        Refresh
                    </button>

                </div>

                {message && (
                    <div className="admin-rescue-message">
                        {message}
                    </div>
                )}

                <form
                    className="admin-rescue-form"
                    onSubmit={
                        handleSubmit
                    }
                >

                    <label>
                        Volunteer

                        <select
                            name="volunteerId"
                            value={
                                form.volunteerId
                            }
                            onChange={
                                handleChange
                            }
                            required
                            disabled={
                                loadingVolunteers ||
                                submitting
                            }
                        >

                            <option value="">
                                {loadingVolunteers
                                    ? "Loading volunteers..."
                                    : "Select Volunteer"}
                            </option>

                            {volunteers.map(
                                (volunteer) => (
                                    <option
                                        key={
                                            volunteer._id
                                        }
                                        value={
                                            volunteer._id
                                        }
                                    >
                                        {volunteer.name ||
                                            volunteer.username ||
                                            volunteer.email}
                                    </option>
                                )
                            )}

                        </select>

                    </label>

                    <label>
                        Animal

                        <select
                            name="animalId"
                            value={
                                form.animalId
                            }
                            onChange={
                                handleChange
                            }
                            disabled={
                                loadingAnimals ||
                                submitting
                            }
                        >

                            <option value="">
                                {loadingAnimals
                                    ? "Loading animals..."
                                    : "Select Animal (Optional)"}
                            </option>

                            {animals.map(
                                (animal) => (
                                    <option
                                        key={
                                            animal._id
                                        }
                                        value={
                                            animal._id
                                        }
                                    >
                                        {animal.name}
                                        {animal.type
                                            ? ` — ${animal.type}`
                                            : ""}
                                    </option>
                                )
                            )}

                        </select>

                    </label>

                    <label>
                        Assignment Type

                        <select
                            name="assignmentType"
                            value={
                                form.assignmentType
                            }
                            onChange={
                                handleChange
                            }
                            disabled={
                                submitting
                            }
                        >

                            <option value="rescue">
                                Rescue
                            </option>

                            <option value="transport">
                                Transport
                            </option>

                            <option value="pickup">
                                Pickup
                            </option>

                            <option value="emergency">
                                Emergency
                            </option>

                        </select>

                    </label>

                    <label>
                        Priority

                        <select
                            name="priority"
                            value={
                                form.priority
                            }
                            onChange={
                                handleChange
                            }
                            disabled={
                                submitting
                            }
                        >

                            <option value="low">
                                Low
                            </option>

                            <option value="normal">
                                Normal
                            </option>

                            <option value="high">
                                High
                            </option>

                            <option value="urgent">
                                Urgent
                            </option>

                        </select>

                    </label>

                    <label>
                        Assignment Title

                        <input
                            type="text"
                            name="title"
                            value={
                                form.title
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Example: Rescue injured dog"
                            required
                            disabled={
                                submitting
                            }
                        />

                    </label>

                    <label>
                        Location

                        <input
                            type="text"
                            name="location"
                            value={
                                form.location
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Rescue location"
                            required
                            disabled={
                                submitting
                            }
                        />

                    </label>

                    <label>
                        Scheduled Date

                        <input
                            type="date"
                            name="scheduledDate"
                            value={
                                form.scheduledDate
                            }
                            onChange={
                                handleChange
                            }
                            required
                            disabled={
                                submitting
                            }
                        />

                    </label>

                    <label>
                        Scheduled Time

                        <input
                            type="time"
                            name="scheduledTime"
                            value={
                                form.scheduledTime
                            }
                            onChange={
                                handleChange
                            }
                            disabled={
                                submitting
                            }
                        />

                    </label>

                    <label className="admin-rescue-description-field">

                        Description

                        <textarea
                            name="description"
                            value={
                                form.description
                            }
                            onChange={
                                handleChange
                            }
                            rows="5"
                            placeholder="Describe what the volunteer needs to do..."
                            required
                            disabled={
                                submitting
                            }
                        />

                    </label>

                    <div className="admin-rescue-form-actions">

                        <button
                            type="submit"
                            disabled={
                                submitting
                            }
                        >
                            {submitting
                                ? (
                                    editingId
                                        ? "Saving..."
                                        : "Creating..."
                                )
                                : (
                                    editingId
                                        ? "Save Changes"
                                        : "Create Assignment"
                                )}
                        </button>

                        {editingId && (
                            <button
                                type="button"
                                onClick={
                                    handleCancelEdit
                                }
                                disabled={
                                    submitting
                                }
                            >
                                Cancel Edit
                            </button>
                        )}

                    </div>

                </form>

            </section>

            <section className="admin-panel admin-rescue-list-panel">

                <div className="admin-panel-heading">

                    <div>
                        <h2>
                            Rescue Assignments
                        </h2>

                        <p>
                            Manage rescue assignments
                            assigned to volunteers.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            fetchAssignments
                        }
                    >
                        Refresh Assignments
                    </button>

                </div>

                {loading ? (
                    <p className="admin-empty">
                        Loading rescue assignments...
                    </p>
                ) : assignments.length === 0 ? (
                    <p className="admin-empty">
                        No rescue assignments found.
                    </p>
                ) : (
                    <div className="admin-rescue-list">

                        {assignments.map(
                            (assignment) => (
                                <article
                                    className="admin-rescue-card"
                                    key={
                                        assignment._id
                                    }
                                >

                                    <div className="admin-rescue-card-main">

                                        <div className="admin-rescue-card-header">

                                            <div>

                                                <h3>
                                                    {
                                                        assignment.title
                                                    }
                                                </h3>

                                                <p>
                                                    {
                                                        assignment.description
                                                    }
                                                </p>

                                            </div>

                                            <span
                                                className={
                                                    getStatusClass(
                                                        assignment.status
                                                    )
                                                }
                                            >
                                                {
                                                    assignment.status
                                                }
                                            </span>

                                        </div>

                                        <div className="admin-rescue-meta">

                                            <div>
                                                <strong>
                                                    Volunteer
                                                </strong>

                                                <span>
                                                    {
                                                        assignment.volunteerName ||
                                                        "Unknown"
                                                    }
                                                </span>

                                                <small>
                                                    {
                                                        assignment.volunteerEmail ||
                                                        "No email"
                                                    }
                                                </small>
                                            </div>

                                            <div>
                                                <strong>
                                                    Animal
                                                </strong>

                                                <span>
                                                    {
                                                        assignment.animalName ||
                                                        "No animal assigned"
                                                    }
                                                </span>

                                                {assignment.animalType && (
                                                    <small>
                                                        {
                                                            assignment.animalType
                                                        }

                                                        {assignment.animalBreed
                                                            ? ` • ${assignment.animalBreed}`
                                                            : ""}
                                                    </small>
                                                )}
                                            </div>

                                            <div>
                                                <strong>
                                                    Location
                                                </strong>

                                                <span>
                                                    {
                                                        assignment.location ||
                                                        "Not specified"
                                                    }
                                                </span>
                                            </div>

                                            <div>
                                                <strong>
                                                    Schedule
                                                </strong>

                                                <span>
                                                    {
                                                        formatDate(
                                                            assignment.scheduledDate
                                                        )
                                                    }
                                                </span>

                                                {assignment.scheduledTime && (
                                                    <small>
                                                        {
                                                            assignment.scheduledTime
                                                        }
                                                    </small>
                                                )}
                                            </div>

                                            <div>
                                                <strong>
                                                    Priority
                                                </strong>

                                                <span
                                                    className={
                                                        getPriorityClass(
                                                            assignment.priority
                                                        )
                                                    }
                                                >
                                                    {
                                                        assignment.priority ||
                                                        "normal"
                                                    }
                                                </span>
                                            </div>

                                            <div>
                                                <strong>
                                                    Type
                                                </strong>

                                                <span>
                                                    {
                                                        assignment.assignmentType ||
                                                        "rescue"
                                                    }
                                                </span>
                                            </div>

                                        </div>

                                        <div className="admin-rescue-card-footer">

                                            <small>
                                                Created{" "}
                                                {
                                                    formatCreatedAt(
                                                        assignment.createdAt
                                                    )
                                                }
                                            </small>

                                            <small>
                                                Assigned by{" "}
                                                {
                                                    assignment.adminName ||
                                                    "Admin"
                                                }
                                            </small>

                                        </div>

                                    </div>

                                    <div className="admin-rescue-actions">

                                        {![
                                            "completed",
                                            "cancelled",
                                        ].includes(
                                            assignment.status
                                        ) && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleEdit(
                                                            assignment
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </button>
                                            )}

                                        {![
                                            "completed",
                                            "cancelled",
                                        ].includes(
                                            assignment.status
                                        ) && (
                                                <button
                                                    type="button"
                                                    className="cancel"
                                                    onClick={() =>
                                                        handleCancelAssignment(
                                                            assignment._id
                                                        )
                                                    }
                                                >
                                                    Cancel
                                                </button>
                                            )}

                                        {![
                                            "accepted",
                                            "active",
                                            "completed",
                                        ].includes(
                                            assignment.status
                                        ) && (
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
                                            )}

                                    </div>

                                </article>
                            )
                        )}

                    </div>
                )}

            </section>

        </section>
    );
}