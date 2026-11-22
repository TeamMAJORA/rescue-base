import { useEffect, useMemo, useRef, useState } from "react";
import { CompleteWithProofModal } from "../../../components/rescue/RescueProof";
import RowActionsMenu from "../../../components/system/RowActionsMenu";
import LoadingState from "../../../components/system/LoadingState";
import LocationPicker from "../../../components/system/LocationPicker";
import TimeField from "../../../components/system/TimeField";
import { DateField, startOfToday } from "../../../components/system/MonthCalendar";
import useCloseOnEscape from "../../../hooks/useCloseOnEscape";
import { askConfirm, askPrompt, notify, notifyError } from "../../../utils/dialogs";
import { formatDate, formatDateTime, formatTime, toDayValue } from "../../../utils/formatDate";

const API = import.meta.env.VITE_BACKEND_URL;

const TYPE_LABELS = {
    rescue: "Rescue",
    transport: "Transport",
    emergency: "Emergency",
    follow_up: "Follow-up",
    other: "Other",
};

const PRIORITY_LABELS = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };

// One vocabulary everywhere (audit R4): the chips and strip use the group, the badge the exact state
const STATUS_GROUPS = [
    ["open", "Open"],
    ["pending", "Waiting for reply"],
    ["in_progress", "In progress"],
    ["completed", "Completed"],
    ["closed", "Closed"],
];

const STATUS_BADGES = {
    open: "Open",
    pending: "Waiting for reply",
    accepted: "Accepted",
    active: "Started",
    completed: "Completed",
    declined: "Declined",
    cancelled: "Cancelled",
};

const ANIMALS_NOT_IN_CARE = ["adopted", "returned_to_owner"];
const PHONE_LAYOUT = "(max-width: 1200px)";

function statusGroup(status) {
    if (status === "accepted" || status === "active") return "in_progress";
    if (status === "declined" || status === "cancelled") return "closed";
    return status || "pending";
}

// Not done and its day has passed
function isOverdue(assignment, today) {
    if (!["open", "pending", "accepted"].includes(assignment.status)) return false;
    const day = toDayValue(assignment.scheduledDate);
    return Boolean(day) && day < today;
}

// "14:30" -> "2:30 PM"
function formatClockTime(value) {
    const [h, m] = String(value || "").split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return formatTime(date);
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

function animalLabel(animal) {
    return [animal.name, animal.type, animal.breed].filter(Boolean).join(" · ");
}

const emptyForm = {
    volunteerId: "",
    animalId: "",
    assignmentType: "rescue",
    title: "",
    description: "",
    location: "",
    latitude: null,
    longitude: null,
    scheduledDate: "",
    scheduledTime: "",
    priority: "normal",
};

async function requestJson(path, { method = "GET", body } = {}) {
    const response = await fetch(`${API}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
            ...(body !== undefined && { "Content-Type": "application/json" }),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || "Something went wrong. Try again.");
    return data;
}

export default function RescueAssignments() {
    const [assignments, setAssignments] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [animals, setAnimals] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [loadingVolunteers, setLoadingVolunteers] = useState(true);
    const [loadingAnimals, setLoadingAnimals] = useState(true);

    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [completingAssignment, setCompletingAssignment] = useState(null);
    const [viewingId, setViewingId] = useState(null);

    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [volunteerFilter, setVolunteerFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");

    const formRef = useRef(null);
    const listRef = useRef(null);

    const myId = currentUserId();
    const today = toDayValue();

    async function fetchAssignments() {
        try {
            setLoading(true);
            setLoadError("");
            const data = await requestJson("/api/rescue-assignments");
            setAssignments(data.assignments || []);
        } catch (error) {
            setLoadError(error.message || "Could not load rescue assignments.");
        } finally {
            setLoading(false);
        }
    }

    async function fetchVolunteers() {
        try {
            const data = await requestJson("/api/users/volunteers?includeStaff=1");
            setVolunteers(data.users || data.volunteers || []);
        } catch (error) {
            notifyError(error.message || "Could not load volunteers.");
        } finally {
            setLoadingVolunteers(false);
        }
    }

    async function fetchAnimals() {
        try {
            const data = await requestJson("/api/animals");
            setAnimals(data.animals || []);
        } catch (error) {
            notifyError(error.message || "Could not load animals.");
        } finally {
            setLoadingAnimals(false);
        }
    }

    useEffect(() => {
        fetchAssignments();
        fetchVolunteers();
        fetchAnimals();
    }, []);

    const editingAssignment = assignments.find((item) => item._id === editingId);
    const viewingAssignment = assignments.find((item) => item._id === viewingId);
    const assigneeLocked = ["accepted", "active"].includes(editingAssignment?.status);

    useCloseOnEscape(Boolean(viewingAssignment), () => setViewingId(null));

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    }

    function handleEdit(assignment) {
        setViewingId(null);
        setEditingId(assignment._id);
        setForm({
            volunteerId: assignment.volunteerId || "",
            animalId: assignment.animalId || "",
            assignmentType: assignment.assignmentType || "rescue",
            title: assignment.title || "",
            description: assignment.description || "",
            location: assignment.location || "",
            latitude: assignment.latitude ?? null,
            longitude: assignment.longitude ?? null,
            scheduledDate: toDayValue(assignment.scheduledDate),
            scheduledTime: assignment.scheduledTime || "",
            priority: assignment.priority || "normal",
        });

        // The form can be far from the row (on phones it is below the list)
        requestAnimationFrame(() => {
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            formRef.current?.elements.title.focus({ preventScroll: true });
        });
    }

    function handleCancelEdit() {
        setEditingId(null);
        setForm(emptyForm);
    }

    function jumpToForm() {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        formRef.current?.elements.volunteerId.focus({ preventScroll: true });
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setSubmitting(true);
            await requestJson(editingId ? `/api/rescue-assignments/${editingId}` : "/api/rescue-assignments", {
                method: editingId ? "PATCH" : "POST",
                body: form,
            });
            notify(editingId ? "Assignment updated." : "Assignment added.");
            handleCancelEdit();
            await fetchAssignments();
            if (window.matchMedia(PHONE_LAYOUT).matches) listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (error) {
            notifyError(error.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function runAction(request, successText, assignmentId) {
        try {
            await request();
            notify(successText);
            if (editingId === assignmentId) handleCancelEdit();
            await fetchAssignments();
        } catch (error) {
            notifyError(error.message);
        }
    }

    async function handleCancelAssignment(assignment) {
        const confirmed = await askConfirm({
            title: `Cancel "${assignment.title}"?`,
            message: assignment.volunteerId ? `${assignment.volunteerName || "The volunteer"} will be told it is off.` : undefined,
            confirmLabel: "Cancel assignment",
            cancelLabel: "Keep it",
            danger: true,
        });
        if (!confirmed) return;
        setViewingId(null);
        runAction(() => requestJson(`/api/rescue-assignments/${assignment._id}/cancel`, { method: "PATCH", body: {} }), "Assignment cancelled.", assignment._id);
    }

    async function handleDeleteAssignment(assignment) {
        const confirmed = await askConfirm({ title: `Delete "${assignment.title}"?`, message: "This can't be undone.", confirmLabel: "Delete", danger: true });
        if (!confirmed) return;
        setViewingId(null);
        runAction(() => requestJson(`/api/rescue-assignments/${assignment._id}`, { method: "DELETE" }), "Assignment deleted.", assignment._id);
    }

    // Staff answering an assignment given to them (same steps a volunteer has)
    async function respondToAssignment(assignment, action) {
        if (action === "complete") {
            setCompletingAssignment(assignment);
            return;
        }

        let body = {};
        if (action === "decline") {
            const reason = await askPrompt({
                title: `Decline "${assignment.title}"?`,
                message: "It goes back to open so another volunteer can take it.",
                label: "Reason (optional)",
                confirmLabel: "Decline",
                danger: true,
            });
            if (reason === null) return;
            body = { reason };
        }

        const successText = { accept: "Assignment accepted.", decline: "Declined. The assignment is open again.", start: "Assignment started." }[action];
        runAction(() => sendAssignmentAction(assignment, action, body), successText, assignment._id);
    }

    // Throws on failure so the proof form can show the error itself
    function sendAssignmentAction(assignment, action, body) {
        return requestJson(`/api/rescue-assignments/${assignment._id}/${action}`, { method: "PATCH", body });
    }

    const counts = useMemo(() => {
        const result = { all: assignments.length, overdue: 0, open: 0, pending: 0, in_progress: 0, completed: 0, closed: 0 };
        assignments.forEach((item) => {
            result[statusGroup(item.status)] += 1;
            if (isOverdue(item, today)) result.overdue += 1;
        });
        return result;
    }, [assignments, today]);

    const shown = useMemo(() => {
        const term = search.trim().toLowerCase();

        return assignments.filter((item) => {
            if (statusFilter === "overdue" ? !isOverdue(item, today) : statusFilter !== "all" && statusGroup(item.status) !== statusFilter) return false;
            if (volunteerFilter && String(item.volunteerId || "") !== volunteerFilter) return false;
            if (priorityFilter && item.priority !== priorityFilter) return false;
            if (!term) return true;

            return [item.title, item.volunteerName, item.volunteerEmail, item.location, item.animalName]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term));
        });
    }, [assignments, statusFilter, volunteerFilter, priorityFilter, search, today]);

    const volunteerOptions = useMemo(
        () => ({
            volunteers: volunteers.filter((person) => person.role !== "staff"),
            staff: volunteers.filter((person) => person.role === "staff"),
        }),
        [volunteers]
    );

    // Animals still in care, A–Z; an edited assignment keeps its saved animal
    const animalOptions = useMemo(
        () =>
            animals
                .filter((animal) => !ANIMALS_NOT_IN_CARE.includes(animal.adoptionStatus) || animal._id === form.animalId)
                .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
        [animals, form.animalId]
    );

    const roleOf = (id) => volunteers.find((person) => String(person._id) === String(id))?.role;
    const isMine = (assignment) => Boolean(assignment.volunteerId) && String(assignment.volunteerId) === myId;

    // New tasks start today or later; editing keeps an earlier saved date valid
    const earliestDay = editingAssignment && form.scheduledDate && form.scheduledDate < today ? new Date(`${form.scheduledDate}T00:00`) : startOfToday();
    const latestDay = new Date(startOfToday().getFullYear() + 1, startOfToday().getMonth(), startOfToday().getDate());

    function primaryAction(assignment) {
        if (isMine(assignment)) {
            if (assignment.status === "pending") return { label: "Accept", onSelect: () => respondToAssignment(assignment, "accept") };
            if (assignment.status === "accepted") return { label: "Start", onSelect: () => respondToAssignment(assignment, "start") };
            if (assignment.status === "active") return { label: "Complete", onSelect: () => respondToAssignment(assignment, "complete") };
        }
        if (assignment.status === "completed") return { label: "View proof", onSelect: () => setViewingId(assignment._id), isQuiet: true };
        return null;
    }

    // Only what the server allows in this state
    function menuItems(assignment) {
        const status = assignment.status || "pending";
        const canEdit = !["completed", "cancelled"].includes(status);
        const canCancel = canEdit && status !== "declined";
        const canDelete = !["accepted", "active", "completed"].includes(status);

        return [
            { label: "View details", onSelect: () => setViewingId(assignment._id) },
            canEdit && { label: "Edit", onSelect: () => handleEdit(assignment) },
            isMine(assignment) && status === "pending" && { label: "Decline", onSelect: () => respondToAssignment(assignment, "decline") },
            canCancel && { label: "Cancel assignment", onSelect: () => handleCancelAssignment(assignment), isDanger: true },
            canDelete && { label: "Delete", onSelect: () => handleDeleteAssignment(assignment), isDanger: true },
        ].filter(Boolean);
    }

    const stripItems = [
        ["open", "Open", counts.open],
        ["pending", "Waiting for reply", counts.pending],
        ["in_progress", "In progress", counts.in_progress],
        ["overdue", "Overdue", counts.overdue],
    ];

    const chips = [["all", "All"], ...STATUS_GROUPS, ...(counts.overdue > 0 || statusFilter === "overdue" ? [["overdue", "Overdue"]] : [])];

    return (
        <section className="rs2-page">
            <div className="um-strip rs2-strip ra-strip">
                <button type="button" className={`um-strip-total${statusFilter === "all" ? " is-on" : ""}`} onClick={() => setStatusFilter("all")}>
                    <b>{counts.all}</b>
                    <small>Total assignments</small>
                </button>
                {stripItems.map(([value, label, count]) => (
                    <button
                        type="button"
                        key={value}
                        className={`${statusFilter === value ? "is-on" : ""}${value === "overdue" && count > 0 ? " is-alert" : ""}`}
                        aria-pressed={statusFilter === value}
                        onClick={() => setStatusFilter(value)}
                    >
                        <small>{label}</small>
                        <b>{count}</b>
                    </button>
                ))}
            </div>

            <div className="rs2-grid ra-grid">
                {/* Create / edit */}
                <form ref={formRef} className={`rs2-card rs2-form ra-form${editingId ? " is-editing" : ""}`} onSubmit={handleSubmit}>
                    <h3>{editingId ? `Edit: ${editingAssignment?.title || "assignment"}` : "New assignment"}</h3>
                    <p className="rs2-sub">
                        {form.volunteerId
                            ? "The person you pick is notified and can accept or decline."
                            : "Open: every volunteer is notified and the first to claim it takes it."}
                    </p>

                    <label className="rs2-field">
                        <span>Assign to</span>
                        <select name="volunteerId" value={form.volunteerId} onChange={handleChange} disabled={loadingVolunteers || assigneeLocked}>
                            <option value="">{loadingVolunteers ? "Loading…" : "Open to all volunteers"}</option>
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
                        {assigneeLocked && (
                            <small className="ra-hint">
                                {editingAssignment.volunteerName || "The volunteer"} already accepted it. Cancel it and add a new one to reassign.
                            </small>
                        )}
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
                            Title <span className="required-mark">*</span>
                        </span>
                        <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Rescue injured dog" maxLength={120} required />
                    </label>

                    <div className="rs2-field">
                        <span>
                            Location <span className="required-mark">*</span>
                        </span>
                        <LocationPicker
                            address={form.location}
                            onAddressChange={(location) => setForm((current) => ({ ...current, location }))}
                            latitude={form.latitude}
                            longitude={form.longitude}
                            onPinChange={(latitude, longitude) => setForm((current) => ({ ...current, latitude, longitude }))}
                            ariaLabel="Location"
                            placeholder="e.g. Gorordo Ave, Lahug"
                            required
                            requiredMessage="Enter location."
                        />
                    </div>

                    <div className="rs2-field">
                        <span>
                            Date <span className="required-mark">*</span>
                        </span>
                        <DateField
                            value={form.scheduledDate}
                            onChange={(day) => setForm((current) => ({ ...current, scheduledDate: day }))}
                            minDate={earliestDay}
                            maxDate={latestDay}
                            ariaLabel="Date"
                            required
                            requiredMessage="Pick a date."
                        />
                    </div>

                    <div className="rs2-field">
                        <span>Time <small>(optional)</small></span>
                        <TimeField
                            value={form.scheduledTime}
                            onChange={(scheduledTime) => setForm((current) => ({ ...current, scheduledTime }))}
                            ariaLabel="Time"
                            clearable
                        />
                    </div>

                    <label className="rs2-field">
                        <span>
                            Animal <small>(optional)</small>
                        </span>
                        <select name="animalId" value={form.animalId} onChange={handleChange} disabled={loadingAnimals}>
                            <option value="">{loadingAnimals ? "Loading animals…" : "None"}</option>
                            {animalOptions.map((animal) => (
                                <option key={animal._id} value={animal._id}>
                                    {animalLabel(animal)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="rs2-field">
                        <span>
                            Description <span className="required-mark">*</span>
                        </span>
                        <textarea name="description" rows={3} value={form.description} onChange={handleChange} placeholder="What the volunteer needs to do…" required />
                    </label>

                    <div className="ra-form-actions">
                        {editingId && (
                            <button type="button" className="ra-secondary" onClick={handleCancelEdit} disabled={submitting}>
                                Cancel
                            </button>
                        )}
                        <button type="submit" className="rs2-submit" disabled={submitting}>
                            {submitting ? "Saving…" : editingId ? "Save changes" : "Add assignment"}
                        </button>
                    </div>
                </form>

                {/* List */}
                <section ref={listRef} className="rs2-card ra-list">
                    <div className="rs2-head">
                        <h3>Assignments</h3>
                        <button type="button" className="rs2-mini is-go ra-jump" onClick={jumpToForm}>
                            + New assignment
                        </button>
                    </div>

                    <div className="rs2-chips ra-chips">
                        {chips.map(([value, label]) => (
                            <button
                                type="button"
                                key={value}
                                className={`${statusFilter === value ? "on" : ""}${value === "overdue" ? " is-alert" : ""}`}
                                aria-pressed={statusFilter === value}
                                onClick={() => setStatusFilter(value)}
                            >
                                {label}
                                <em>{counts[value]}</em>
                            </button>
                        ))}
                    </div>

                    <div className="rs2-tools">
                        <label className="rs2-search">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                aria-label="Search title, person or location"
                                type="search"
                                value={search}
                                placeholder="Search title, person or location…"
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
                        <LoadingState label="Loading assignments…" />
                    ) : loadError ? (
                        <div className="rs2-empty" role="alert">
                            <p>{loadError}</p>
                            <button type="button" className="rs2-mini" onClick={fetchAssignments}>
                                Retry
                            </button>
                        </div>
                    ) : shown.length === 0 ? (
                        <p className="rs2-empty">
                            {assignments.length === 0 ? "No rescue assignments yet. Add the first one with the form." : "No assignments match your search or filters."}
                        </p>
                    ) : (
                        <div className="rs2-table-wrap ra-table-wrap">
                            <table className="rs2-table ra-table">
                                <thead>
                                    <tr>
                                        <th>Assignment</th>
                                        <th>Assigned to</th>
                                        <th>When &amp; where</th>
                                        <th>Status</th>
                                        <th aria-label="Actions" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {shown.map((assignment) => {
                                        const status = assignment.status || "pending";
                                        const time = formatClockTime(assignment.scheduledTime);
                                        const overdue = isOverdue(assignment, today);
                                        const action = primaryAction(assignment);
                                        const priority = assignment.priority || "normal";

                                        return (
                                            <tr
                                                key={assignment._id}
                                                className={editingId === assignment._id ? "is-editing" : ""}
                                                onClick={(event) => {
                                                    if (!event.target.closest("button, a")) setViewingId(assignment._id);
                                                }}
                                            >
                                                <td className="ra-cell-main">
                                                    <button type="button" className="ra-title" onClick={() => setViewingId(assignment._id)}>
                                                        {assignment.title || "Untitled assignment"}
                                                    </button>
                                                    <small>
                                                        {TYPE_LABELS[assignment.assignmentType] || "Rescue"}
                                                        {assignment.animalName ? ` · ${assignment.animalName}` : ""}
                                                    </small>
                                                </td>
                                                <td data-label="Assigned to">
                                                    <b>
                                                        {assignment.volunteerName || "Open to volunteers"}
                                                        {isMine(assignment) ? " (you)" : ""}
                                                    </b>
                                                    <small>
                                                        {!assignment.volunteerId ? "Any volunteer can claim" : roleOf(assignment.volunteerId) === "staff" ? "Staff" : "Volunteer"}
                                                    </small>
                                                </td>
                                                <td data-label="When & where">
                                                    <b className="rs2-nowrap">{assignment.scheduledDate ? formatDate(assignment.scheduledDate) : "Not scheduled"}</b>
                                                    {time && <small>{time}</small>}
                                                    <small>{assignment.location || "—"}</small>
                                                </td>
                                                <td data-label="Status">
                                                    <span className="ra-badges">
                                                        <span className={`rs2-status is-${status}`}>{STATUS_BADGES[status] || status}</span>
                                                        {overdue && <span className="ra-overdue">Overdue</span>}
                                                        <span className={`rs2-priority is-${priority}`}>{PRIORITY_LABELS[priority] || "Normal"}</span>
                                                    </span>
                                                </td>
                                                <td className="ra-cell-actions">
                                                    <div className="rs2-actions">
                                                        {action && (
                                                            <button type="button" className={`rs2-mini${action.isQuiet ? "" : " is-go"}`} onClick={action.onSelect}>
                                                                {action.label}
                                                            </button>
                                                        )}
                                                        <RowActionsMenu ariaLabel={`More actions for ${assignment.title || "assignment"}`} items={menuItems(assignment)} />
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

            {viewingAssignment && (
                <AssignmentDetails
                    assignment={viewingAssignment}
                    overdue={isOverdue(viewingAssignment, today)}
                    canEdit={!["completed", "cancelled"].includes(viewingAssignment.status)}
                    onEdit={() => handleEdit(viewingAssignment)}
                    onClose={() => setViewingId(null)}
                />
            )}

            {completingAssignment && (
                <CompleteWithProofModal
                    assignment={completingAssignment}
                    onClose={() => setCompletingAssignment(null)}
                    onSubmit={async (proof) => {
                        await sendAssignmentAction(completingAssignment, "complete", proof);
                        setCompletingAssignment(null);
                        notify("Assignment completed.");
                        await fetchAssignments();
                    }}
                />
            )}
        </section>
    );
}

// Read a task without opening edit (audit R10): who, when, notes, timeline and proof
function AssignmentDetails({ assignment, overdue, canEdit, onEdit, onClose }) {
    const status = assignment.status || "pending";
    const priority = assignment.priority || "normal";
    const time = formatClockTime(assignment.scheduledTime);
    const photos = assignment.completionPhotos || [];

    const timeline = [
        ["Created", assignment.createdAt, assignment.adminName ? `by ${assignment.adminName}` : ""],
        ["Declined", assignment.declinedAt, "Reopened for other volunteers"],
        ["Accepted", assignment.acceptedAt, ""],
        ["Started", assignment.startedAt, ""],
        ["Completed", assignment.completedAt, ""],
        ["Cancelled", assignment.cancelledAt, ""],
    ].filter(([, at]) => at);

    const facts = [
        ["Assigned to", assignment.volunteerName || "Open to all volunteers"],
        ["When", assignment.scheduledDate ? `${formatDate(assignment.scheduledDate, { withWeekday: true })}${time ? `, ${time}` : ""}` : "Not scheduled"],
        ["Where", assignment.location || "—"],
        ["Animal", [assignment.animalName, assignment.animalType, assignment.animalBreed].filter(Boolean).join(" · ") || "None"],
    ];

    return (
        <div className="ao-confirm-backdrop" onClick={onClose}>
            <div className="ao-confirm rp-modal ra-details" role="dialog" aria-modal="true" aria-labelledby="ra-details-title" onClick={(event) => event.stopPropagation()}>
                <h3 id="ra-details-title">{assignment.title || "Untitled assignment"}</h3>
                <div className="ra-badges">
                    <span className={`rs2-status is-${status}`}>{STATUS_BADGES[status] || status}</span>
                    {overdue && <span className="ra-overdue">Overdue</span>}
                    <span className={`rs2-priority is-${priority}`}>{PRIORITY_LABELS[priority] || "Normal"}</span>
                    <span className="ra-type">{TYPE_LABELS[assignment.assignmentType] || "Rescue"}</span>
                </div>

                <dl className="ra-facts">
                    {facts.map(([label, value]) => (
                        <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>

                <div className="rp-field">
                    <span>Description</span>
                    <p className="rp-notes">{assignment.description || "No description."}</p>
                </div>

                {assignment.volunteerNotes && (
                    <div className="rp-field">
                        <span>{assignment.declinedAt && status === "open" ? "Reason given when declined" : "Volunteer notes"}</span>
                        <p className="rp-notes">{assignment.volunteerNotes}</p>
                    </div>
                )}

                {status === "completed" && (
                    <>
                        <div className="rp-field">
                            <span>What was done</span>
                            <p className="rp-notes">{assignment.completionNotes || "No notes given."}</p>
                        </div>
                        <div className="rp-field">
                            <span>Proof photos</span>
                            {photos.length === 0 ? (
                                <p className="rp-notes">No photos (completed before proof was required).</p>
                            ) : (
                                <div className="rp-photos is-large">
                                    {photos.map((url) => (
                                        <a key={url} className="rp-photo" href={url} target="_blank" rel="noreferrer" title="Open full size">
                                            <img src={url} alt="Proof" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {timeline.length > 0 && (
                    <div className="rp-field">
                        <span>Timeline</span>
                        <ol className="ra-timeline">
                            {timeline.map(([label, at, note]) => (
                                <li key={label}>
                                    <b>{label}</b> {formatDateTime(at)}
                                    {note && <small> · {note}</small>}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                <div className="ao-confirm-actions">
                    <button type="button" onClick={onClose}>
                        Close
                    </button>
                    {canEdit && (
                        <button type="button" className="ao-confirm-ok" onClick={onEdit}>
                            Edit
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
