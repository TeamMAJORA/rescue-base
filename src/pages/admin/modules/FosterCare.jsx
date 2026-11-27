import {
    useEffect, useRef, useState
} from "react"
import InfoTip from "../../../components/system/InfoTip";
import { askConfirm, notify, notifyError } from "../../../utils/dialogs";
import { formatDate, formatDateTime, toDayValue } from "../../../utils/formatDate";
import LoadingState from "../../../components/system/LoadingState";
import useCloseOnEscape from "../../../hooks/useCloseOnEscape";
import Icon from "../../../components/system/Icon"; 

const API = import.meta.env.VITE_BACKEND_URL;

const DAY_MS = 24 * 60 * 60 * 1000;

const BEHAVIOR_EVALUATION_LABEL = {
    not_submitted: "Not submitted yet",
    pending: "Waiting for review",
    accepted: "Accepted",
    revision: "Sent back to the foster for revision",
};

// Planned to last 30+ days (no end date counts as long) -> weekly updates expected
// A weekly report the shelter hasn't opened yet (shown as "New")
function hasUnseenUpdates(assignment) {
    return (assignment.updates || []).some((update) => !update.seenAt);
}

function isLongAssignment(assignment) {
    if (!assignment.endDate) return true;
    const start = new Date(assignment.startDate || assignment.createdAt);
    return new Date(assignment.endDate) - start >= 30 * DAY_MS;
}

function lastUpdateDate(assignment) {
    const dates = (assignment.updates || []).map((update) => new Date(update.createdAt).getTime());
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates));
}

function weeklyUpdateIsDue(assignment) {
    if (assignment.status !== "active" || !isLongAssignment(assignment)) return false;
    const since = lastUpdateDate(assignment) || new Date(assignment.startDate || assignment.createdAt);
    return Date.now() - since.getTime() >= 7 * DAY_MS;
}

function askedInLastDay(assignment) {
    return Boolean(
        assignment.lastUpdateRequestedAt &&
            Date.now() - new Date(assignment.lastUpdateRequestedAt).getTime() < DAY_MS
    );
}


function hasPendingCapacityRequest(application) {
    return application.capacityRequest?.status === "pending";
}

// An edited application (or a new capacity request) counts as unseen again until the admin opens it
function seenKey(application) {
    if (hasPendingCapacityRequest(application)) {
        return `${application._id}@capacity@${application.capacityRequest.requestedAt}`;
    }
    return application.lastEditedAt
        ? `${application._id}@${application.lastEditedAt}`
        : application._id;
}

// Care instructions every foster assignment always includes
const ESSENTIAL_CARE = [
    "Feed twice a day",
    "Fresh water at all times",
    "Daily walk or playtime",
    "Keep indoors at night",
    "Submit a weekly update",
];

const emptyAssignmentForm = {
    animalId: "",
    fosterApplicationId: "",
    fosterName: "",
    fosterEmail: "",
    petName: "",
    petBreed: "",
    petImage: "",
    careInstructions: ESSENTIAL_CARE.join("\n"),
    startDate: "",
    endDate: "",
};

// Assign pop-up: quick picks for the expected end date
const FOSTER_LENGTHS = [
    { label: "2 weeks", days: 14 },
    { label: "1 month", days: 30 },
    { label: "2 months", days: 60 },
    { label: "3 months", days: 90 },
];


function addDays(dateText, days) {
    const date = new Date(`${dateText}T00:00:00`);
    date.setDate(date.getDate() + days);
    return toDayValue(date);
}


// Update icons here, add nako sa public and mga svgs later
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
    // The app's paw (same file as the sidebar Animals icon)
    paw: <image href="/icons/sidebar/brown paw.svg" x="2" y="2" width="20" height="20" />,
    // new: no trash icon exists in the project yet
    trash: (
        <>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
        </>
    ),

        // reused from AdoptionApplications review modal
    mail: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
        </>
    ),
    calendar: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
        </>
    ),
    x: <path d="M7 7l10 10M17 7 7 17" />,
    // new: small "i" for the info note
    info: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
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

// ----- Care instructions as a checklist -----
// Each row is saved as one line; the foster sees every line as a checklist item.
// The essentials are always included and can't be removed; extras (like medicine) are optional.
const OPTIONAL_CARE_PRESETS = ["Give medicine as prescribed"];

const ESSENTIAL_COUNT = ESSENTIAL_CARE.length;

// The first rows are the essentials (always there, can be reworded); the rest are extras.
// Older assignments with fewer rows get the essentials added in front.
function careRows(text) {
    const lines = String(text || "").split("\n");
    const filled = lines.filter((line) => line.trim());
    if (filled.length < ESSENTIAL_COUNT) return [...ESSENTIAL_CARE, ...filled];
    return lines;
}

// For saving: an essential left empty goes back to its default; empty extras are dropped
function withEssentialCare(text) {
    const rows = careRows(text);
    const essentials = ESSENTIAL_CARE.map((fallback, index) => String(rows[index] || "").trim() || fallback);
    const extras = rows.slice(ESSENTIAL_COUNT).map((row) => row.trim()).filter(Boolean);
    return [...essentials, ...extras].join("\n");
}

function CareChecklistInput({ value, onChange }) {
    const rows = careRows(value);
    const inputsRef = useRef([]);
    const [focusIndex, setFocusIndex] = useState(null);

    // Move the cursor to a row after adding/removing one
    useEffect(() => {
        if (focusIndex === null) return;
        inputsRef.current[focusIndex]?.focus();
        setFocusIndex(null);
    }, [focusIndex, value]);

    function save(next) {
        onChange(next.join("\n"));
    }

    function editRow(index, text) {
        const next = [...rows];
        next[index] = text.replace(/\n/g, " ");
        save(next);
    }

    function addRow(afterIndex = rows.length - 1, text = "") {
        const at = Math.max(afterIndex + 1, ESSENTIAL_COUNT);
        const next = [...rows];
        next.splice(at, 0, text);
        save(next);
        setFocusIndex(at);
    }

    function removeRow(index) {
        if (index < ESSENTIAL_COUNT) return;
        save(rows.filter((_, i) => i !== index));
        setFocusIndex(index - 1);
    }

    function addPreset(text) {
        const extras = rows.slice(ESSENTIAL_COUNT).filter((row) => row.trim());
        save([...rows.slice(0, ESSENTIAL_COUNT), ...extras, text]);
    }

    function handleKeyDown(event, index) {
        if (event.key === "Enter") {
            event.preventDefault();
            addRow(index);
        }

        if (event.key === "Backspace" && !rows[index] && index >= ESSENTIAL_COUNT) {
            event.preventDefault();
            removeRow(index);
        }
    }

    const used = rows.map((row) => row.trim().toLowerCase());

    return (
        <div className="acl">
            <ul className="acl-list">
                {rows.map((row, index) => {
                    const isEssential = index < ESSENTIAL_COUNT;
                    return (
                        <li key={index} className={`acl-row ${isEssential ? "is-essential" : ""}`}>
                            <span className="acl-check" aria-hidden="true">
                                <StatIcon name="check" size={12} />
                            </span>
                            <input
                                ref={(element) => { inputsRef.current[index] = element; }}
                                value={row}
                                onChange={(event) => editRow(index, event.target.value)}
                                onKeyDown={(event) => handleKeyDown(event, index)}
                                placeholder={isEssential ? ESSENTIAL_CARE[index] : "e.g. Give medicine as prescribed"}
                                maxLength={120}
                                aria-label={`Care instruction ${index + 1}`}
                            />
                            {isEssential ? (
                                <small className="acl-lock" title="Always included. You can reword it.">Required</small>
                            ) : (
                                <button
                                    type="button"
                                    className="acl-remove"
                                    onClick={() => removeRow(index)}
                                    aria-label={`Remove instruction ${index + 1}`}
                                >
                                    <StatIcon name="x" size={12} />
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>

            <button type="button" className="acl-add" onClick={() => addRow()}>
                + Add instruction
            </button>

            <div className="acl-presets">
                <small>Quick add:</small>
                {OPTIONAL_CARE_PRESETS.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        onClick={() => addPreset(preset)}
                        disabled={used.includes(preset.toLowerCase())}
                    >
                        + {preset}
                    </button>
                ))}
            </div>
        </div>
    );
}
// openAssignmentId: open that assignment's details card (from a bell notification)
export default function FosterCare({ openAssignmentId = null, onOpenAssignmentHandled } = {}) {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [requestingUpdateId, setRequestingUpdateId] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [medicalRequests, setMedicalRequests] = useState([]);
    const [listFilter, setListFilter] = useState("all");
    const [listSearch, setListSearch] = useState("");
    const [appFilter, setAppFilter] = useState("all");
    const [reviewingApplication, setReviewingApplication] = useState(null);
    const [rejectNote, setRejectNote] = useState("");
    const [rejectError, setRejectError] = useState("");

    useEffect(() => {
        setRejectNote("");
        setRejectError("");
    }, [reviewingApplication]);

    const [reviewingRequest, setReviewingRequest] = useState(null);

    // Early return requested by a foster (Confirm / Decline pop-up)
    const [earlyReturn, setEarlyReturn] = useState(null);
    const [earlyReturnNote, setEarlyReturnNote] = useState("");
    const [earlyReturnError, setEarlyReturnError] = useState("");
    const [earlyReturnBusy, setEarlyReturnBusy] = useState(false);

    function openEarlyReturn(assignment) {
        setEarlyReturn(assignment);
        setEarlyReturnNote("");
        setEarlyReturnError("");
    }

    async function handleEarlyReturn(action) {
        if (!earlyReturn) return;

        if (action === "decline" && !earlyReturnNote.trim()) {
            setEarlyReturnError("Add a note so the foster knows why.");
            return;
        }

        try {
            setEarlyReturnBusy(true);
            setEarlyReturnError("");

            const response = await fetch(
                `${API}/api/foster/assignments/${earlyReturn._id}/return-request`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true",
                    },
                    body: JSON.stringify({ action, adminNote: earlyReturnNote }),
                }
            );
            const data = await response.json();

            if (!response.ok || !data.success) {
                setEarlyReturnError(data.message || "Could not update the request.");
                return;
            }

            setEarlyReturn(null);
            notify(data.message);
            fetchAssignments();
            fetchAnimals();
        } catch (error) {
            console.error(error);
            setEarlyReturnError("Server error. Please try again.");
        } finally {
            setEarlyReturnBusy(false);
        }
    }
    const [assigningApplication, setAssigningApplication] = useState(null);
    // Assign pop-up pet picker
    const [petSearch, setPetSearch] = useState("");
    const [petScope, setPetScope] = useState("match");
    const token = localStorage.getItem("token")

    const [assignmentForm, setAssignmentForm] =
        useState(emptyAssignmentForm);
    const [animals, setAnimals] = useState([]);
    const [animalsLoading, setAnimalsLoading] = useState(false);
    const [applications, setApplications] = useState([]);
    
    const SEEN_KEY = "rb_seen_foster_apps";
    const [seenAppIds, setSeenAppIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(SEEN_KEY) || "null");
        } catch {
            return null;
        }
    });

    function saveSeen(ids) {
        setSeenAppIds(ids);
        try {
            localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
        } catch {
            // ignore storage errors
        }
    }

    function markAppSeen(application) {
        const key = seenKey(application);
        if (seenAppIds?.includes(key)) return;
        saveSeen([...(seenAppIds || []), key]);
    }

    function markAllAppsSeen() {
        saveSeen(applications.map(seenKey));
    }

    // Animals for the "Animal" dropdown (assignments link to a real animal)
   
    // "Send back" form on a pending behavior evaluation
    const [returningId, setReturningId] = useState(null);
    // Details card for one assignment (opened by clicking its row) and the row's ⋯ menu
    const [viewingAssignmentId, setViewingAssignmentId] = useState(null);
    const [openAssignmentMenuId, setOpenAssignmentMenuId] = useState(null);
    const [openAssignmentMenuPosition, setOpenAssignmentMenuPosition] = useState({ top: 0, right: 0 });
    const [returnReason, setReturnReason] = useState("");
    const [returnError, setReturnError] = useState("");

    async function fetchAnimals() {
        try {
            const response = await fetch(`${API}/api/animals`, { headers: { "ngrok-skip-browser-warning": "true" } });
            const data = await response.json();

            if (response.ok && data.success) {
                setAnimals(data.animals || []);
            }
        } catch (error) {
            console.error("Fetch animals error:", error);
        }
    }

    // Animals that can be fostered: not adopted and not already with a foster
    // (the one in the assignment being edited stays in the list)
    function fosterableAnimals(keepId = "") {
        const busy = new Set(
            assignments
                .filter((item) => item.status === "active" && item.animalId)
                .map((item) => String(item.animalId))
        );

        return animals.filter(
            (animal) =>
                String(animal._id) === String(keepId) ||
                (animal.adoptionStatus !== "adopted" && !busy.has(String(animal._id)))
        );
    }

    function pickAnimal(animalId) {
        const animal = animals.find((item) => String(item._id) === String(animalId));

        setAssignmentForm((current) => ({
            ...current,
            animalId,
            petName: animal?.name || "",
            petBreed: animal?.breed || "",
            petImage: animal?.image || "",
        }));
    }

    function animalLabel(animal) {
        return `${animal.name} · ${animal.type || "Pet"}${animal.breed ? ` · ${animal.breed}` : ""}`;
    }

    async function fetchAssignments() {
        try {
            setLoading(true);

            const response = await fetch(`${API}/api/foster/assignments`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "ngrok-skip-browser-warning": "true"
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
                    Authorization: `Bearer ${token}`,
                    "ngrok-skip-browser-warning": "true"
                }
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                notifyError(data.message || "Failed to fetch foster applications.");
                return;
            }

            const list = data.applications || [];
            setApplications(list);

            // First visit ever: don't flag old applications as new
            setSeenAppIds((current) => {
                if (current !== null) return current;
                const ids = list.map(seenKey);
                try {
                    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
                } catch {
                    // ignore storage errors
                }
                return ids;
            });
        } catch (error) {
            console.error("Fetch foster applications error:", error);
            notifyError("Server error while fetching foster applications.");
        }
    }

    async function handleReviewFosterApplication(applicationId, status, note = "") {
        try {

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const response = await fetch(
                `${API}/api/foster/applications/${applicationId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true"
                    },
                    body: JSON.stringify({
                        status,
                        adminName: savedUser.name || savedUser.username || "Admin User",
                        adminEmail: savedUser.email || "admin",
                        reviewNotes:
                            status === "approved"
                                ? "Approved for foster care."
                                : note.trim(),
                    }),
                }
            );

            const data = await response.json();

            console.log("Review foster application:", data);

            if (!response.ok || !data.success) {
                notifyError(data.message || "Failed to review foster application.");
                return false;
            }

            notify(`Foster application ${status}.`);

            fetchFosterApplications();
            return true;
        } catch (error) {
            console.error("Review foster application error:", error);
            notifyError("Server error while reviewing foster application.");
            return false;
        }
    }

    async function decideCapacityRequest(application, decision) {
        try {
            const response = await fetch(
                `${API}/api/foster/applications/${application._id}/capacity-request`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true",
                    },
                    body: JSON.stringify({ decision }),
                }
            );
            const data = await response.json();

            if (!response.ok || !data.success) {
                notifyError(data.message || "Could not update the capacity request.");
                return;
            }

            notify(data.message);
            setReviewingApplication(null);
            fetchFosterApplications();
        } catch (error) {
            console.error("Capacity request decision error:", error);
            notifyError("Server error while updating the capacity request.");
        }
    }

    async function handleAcceptBehaviorEvaluation(id) {
        try {

            const response = await fetch(
                `${API}/api/foster/assignments/${id}/behavior-evaluation/accept`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true",
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                notifyError(data.message || "Failed to accept behavioral evaluation");
                return;
            }

            notify(data.message || "Behavioral evaluation accepted.");

            await fetchAssignments();
        } catch (error) {
            console.error("Accept behavioral evaluation error:", error);
            notifyError("Server error while accepting behavioral evaluation");
        }
    }

    function startReturn(id) {
        setReturningId(id);
        setReturnReason("");
        setReturnError("");
    }

    async function handleReturnBehaviorEvaluation(id) {
        if (!returnReason.trim()) {
            setReturnError("Please write what the foster should fix. They will see it.");
            return;
        }

        try {

            const response = await fetch(
                `${API}/api/foster/assignments/${id}/behavior-evaluation/return`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true",
                    },
                    body: JSON.stringify({ reason: returnReason.trim() }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setReturnError(data.message || "Failed to send the evaluation back.");
                return;
            }

            notify("Behavioral evaluation sent back to the foster for revision.");

            setReturningId(null);
            setReturnReason("");
            await fetchAssignments();
        } catch (error) {
            console.error("Return behavioral evaluation error:", error);
            setReturnError("Server error while sending the evaluation back.");
        }
    }

    function handleEditAssignment(assignment) {
        if (assignment.status !== "active") {
            notifyError(
                "Only active assignments can be edited."
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

            animalId:
                assignment.animalId || "",

            petName:
                assignment.petName,

            petBreed:
                assignment.petBreed,

            petImage:
                assignment.petImage,

            careInstructions:
                withEssentialCare(assignment.careInstructions),
        });

        setMessage("");
        fetchAnimals();
    }

    function handleCancelEdit() {
        setEditingId(null);
        setAssignmentForm(emptyAssignmentForm);
        setMessage("");
    }

    async function handleCompleteAssignment(assignment) {
        const confirmed = await askConfirm({
            title: `Complete ${assignment.petName}'s foster assignment?`,
            message: "The foster care ends today and the foster is notified.",
            confirmLabel: "Complete",
        });
        if (!confirmed) return;

        try {
            const response = await fetch(`${API}/api/foster/assignments/${assignment._id}/complete`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
            });
            const data = await response.json();

            if (response.ok && data.success) notify(data.message || "Foster assignment completed.");
            else notifyError(data.message || "Could not complete the assignment.");
            if (response.ok && data.success) fetchAssignments();
        } catch (error) {
            console.error("Complete foster assignment error:", error);
            notifyError("Server error while completing the assignment.");
        }
    }

    async function handleRequestUpdate(assignment) {
        try {
            setRequestingUpdateId(assignment._id);

            const response = await fetch(`${API}/api/foster/assignments/${assignment._id}/request-update`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
            });
            const data = await response.json();

            if (response.ok && data.success) notify(data.message || "Update requested.");
            else notifyError(data.message || "Could not ask for an update.");
            if (response.ok && data.success) fetchAssignments();
        } catch (error) {
            console.error("Request weekly update error:", error);
            notifyError("Server error while asking for an update.");
        } finally {
            setRequestingUpdateId("");
        }
    }

    async function handleDeleteAssignment(id) {
        const confirmDelete = await askConfirm({ title: "Delete this foster assignment?", message: "This can't be undone.", confirmLabel: "Delete", danger: true });

        if (!confirmDelete) return;

        try {

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const response = await fetch(`${API}/api/foster/assignments/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "ngrok-skip-browser-warning": "true"
                },
                body: JSON.stringify({
                    adminName: savedUser.name || savedUser.username || "Admin User",
                    adminEmail: savedUser.email || "admin",
                }),
            });

            const data = await response.json();
            console.log("Delete foster assignment:", data);

            if (!response.ok || !data.success) {
                notifyError(data.message || "Failed to delete assignment.");
                return;
            }

            notify("Foster assignment deleted.");

            if (editingId === id) {
                handleCancelEdit();
            }

            fetchAssignments();
        } catch (error) {
            console.error("Delete foster assignment error:", error);
            notifyError("Server error while deleting assignment.");
        }
    }

    async function handleCreateAssignment(e) {
        e.preventDefault();

        if (!assignmentForm.animalId) {
            setMessage("Please choose an animal from the list.");
            return;
        }

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
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true"
                    },
                    body: JSON.stringify({
                        ...assignmentForm,
                        careInstructions: withEssentialCare(assignmentForm.careInstructions),

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

            setMessage("");
            notify("Assignment saved.");

            setAssignmentForm(emptyAssignmentForm);
            setAssigningApplication(null);
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
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true"
                    },
                    body: JSON.stringify({
                        ...assignmentForm,
                        careInstructions: withEssentialCare(assignmentForm.careInstructions),
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

            setMessage("");
            notify("Assignment saved.");

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
                        "ngrok-skip-browser-warning": "true",
                    },
                    body: JSON.stringify({ status }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                notifyError(
                    data.message || "Failed to update medical request."
                );
                return;
            }

            notify("Medical request updated successfully.");
            fetchMedicalRequests();
        } catch (error) {
            console.error("Update medical request error:", error);
            notifyError("Something went wrong while updating the request.");
        }
    }

    async function fetchMedicalRequests() {
        try {
            const response = await fetch(
                `${API}/api/foster/medical-requests`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true",
                    },
                }
            );

            const data = await response.json();

            console.log("Medical requests:", data);

            if (!response.ok || !data.success) {
                notifyError(
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
        fetchAnimals();
    }, []);


    // Check for new applications every 60 seconds, and right away when the admin comes back to the tab
    useEffect(() => {
        const interval = setInterval(fetchFosterApplications, 60000);

        function handleVisible() {
            if (document.visibilityState === "visible") fetchFosterApplications();
        }

        document.addEventListener("visibilitychange", handleVisible);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisible);
        };
    }, []);

    // ----- Foster Applications -----
    const APP_FILTERS = [
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
    ];


    // Pending applications (or approved ones the foster edited) this admin hasn't opened yet
    const newApplicationIds = applications
        .filter((application) =>
            (application.status === "pending" ||
                (application.status === "approved" &&
                    (application.lastEditedAt || hasPendingCapacityRequest(application)))) &&
            seenAppIds !== null &&
            !seenAppIds.includes(seenKey(application))
        )
        .map((application) => application._id);

    const newApplicationCount = newApplicationIds.length;

    // Show the count in the browser tab, e.g. "(2) RescueBase"
    useEffect(() => {
        const baseTitle = document.title.replace(/^\(\d+\)\s*/, "");
        document.title = newApplicationCount > 0
            ? `(${newApplicationCount}) ${baseTitle}`
            : baseTitle;

        return () => {
            document.title = document.title.replace(/^\(\d+\)\s*/, "");
        };
    }, [newApplicationCount]);

    const visibleApplications =
        appFilter === "all"
            ? applications
            : applications.filter((application) => application.status === appFilter);

    // Active animals per foster email (used for "Full")
    const activeCountByEmail = assignments.reduce((counts, assignment) => {
        if (assignment.status === "active") {
            counts[assignment.fosterEmail] = (counts[assignment.fosterEmail] || 0) + 1;
        }
        return counts;
    }, {});

    function isFosterFull(application) {
        const used = activeCountByEmail[application.applicantEmail] || 0;
        return used >= (Number(application.capacity) || 1);
    }

    // Pets that can still be fostered (not adopted, not already in foster)
    async function fetchAssignableAnimals() {
        try {
            setAnimalsLoading(true);
            const response = await fetch(`${API}/api/animals`, { headers: { "ngrok-skip-browser-warning": "true" } });
            const data = await response.json();
            const list = Array.isArray(data.animals) ? data.animals : [];

            setAnimals(
                list.filter(
                    (animal) =>
                        animal.adoptionStatus !== "adopted" &&
                        animal.adoptionStatus !== "returned_to_owner" &&
                        animal.fosterStatus !== "in_foster"
                )
            );
        } catch (error) {
            console.error(error);
            setAnimals([]);
        } finally {
            setAnimalsLoading(false);
        }
    }

    // Assign: open the "New Foster Assignment" pop-up for this foster
    function startAssign(application) {
        setMessage("");
        fetchAssignableAnimals();
        setAssignmentForm({
            ...emptyAssignmentForm,
            fosterApplicationId: application._id,
            fosterName: application.applicantName,
            fosterEmail: application.applicantEmail,
            startDate: toDayValue(new Date()),
        });
        setPetSearch("");
        setPetScope("match");
        setAssigningApplication(application);
    }

    function closeAssign() {
        setAssigningApplication(null);
        setAssignmentForm(emptyAssignmentForm);
    }

    async function decideFromReview(status) {
        if (!reviewingApplication) return;

        // A reason is required to reject; the applicant sees it
        if (status === "rejected" && !rejectNote.trim()) {
            setRejectError("Please write a reason. The applicant will see it.");
            return;
        }

        const ok = await handleReviewFosterApplication(reviewingApplication._id, status, rejectNote);
        if (ok) setReviewingApplication(null);
    }

    function yesNo(value) {
        return value ? "Yes" : "No";
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

    const PREFERS_LABEL = { Dog: "Dogs", Cat: "Cats", Both: "Both", Other: "Other" };

    // ----- Current Foster Assignments list -----
    const LIST_FILTERS = [
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "completed", label: "Completed" },
        { value: "returned", label: "Returned" },
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
        return formatDate(value, { withYear: false });
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

    // ----- Medical Requests -----
    // Open requests first, newest first inside each group
    const sortedMedicalRequests = [...medicalRequests].sort((a, b) => {
        const aOpen = a.status !== "resolved";
        const bOpen = b.status !== "resolved";
        if (aOpen !== bOpen) return aOpen ? -1 : 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const URGENCY_LABEL = {
        Low: "Low",
        Medium: "Medium",
        High: "Urgent",
        Emergency: "Emergency",
    };

    const MEDICAL_STATUS_LABEL = {
        pending: "Pending",
        in_progress: "In progress",
        resolved: "Resolved",
    };

    async function updateFromReview(status) {
        if (!reviewingRequest) return;
        await handleUpdateMedicalRequest(
            reviewingRequest.assignmentId,
            reviewingRequest._id,
            status
        );
        setReviewingRequest(null);
    }

    // Always read the card's assignment from the latest list, so it updates after any action
    const viewedAssignment = assignments.find((item) => item._id === viewingAssignmentId) || null;

    // Bell notification about an assignment: open its card once the list is loaded
    useEffect(() => {
        if (!openAssignmentId || loading) return;
        if (assignments.some((item) => item._id === openAssignmentId)) setViewingAssignmentId(openAssignmentId);
        else notifyError("That foster assignment no longer exists.");
        onOpenAssignmentHandled?.();
    }, [openAssignmentId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

    // Weekly reports the shelter hadn't seen when this card opened: tagged "New" in the card
    const [newUpdateIds, setNewUpdateIds] = useState([]);

    // Opening the details counts as seeing its weekly reports: the foster then sees "Seen"
    useEffect(() => {
        const unseenIds = (viewedAssignment?.updates || []).filter((update) => !update.seenAt).map((update) => update._id);
        setNewUpdateIds(unseenIds);
        if (unseenIds.length === 0) return;

        fetch(`${API}/api/foster/assignments/${viewedAssignment._id}/updates/seen`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
        })
            .then((response) => {
                if (response.ok) fetchAssignments();
            })
            .catch((error) => console.error("Mark weekly updates seen error:", error));
    }, [viewingAssignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Escape closes the open window (review, assign, edit, early return, medical request)
    useCloseOnEscape(Boolean(reviewingApplication), () => setReviewingApplication(null));
    useCloseOnEscape(Boolean(assigningApplication), closeAssign);
    useCloseOnEscape(Boolean(editingId), handleCancelEdit);
    useCloseOnEscape(Boolean(earlyReturn), () => setEarlyReturn(null));
    useCloseOnEscape(Boolean(reviewingRequest), () => setReviewingRequest(null));
    useCloseOnEscape(Boolean(viewingAssignmentId), () => setViewingAssignmentId(null));

    // Close the row's ⋯ menu on any outside click, scroll or resize
    useEffect(() => {
        if (!openAssignmentMenuId) return undefined;
        const closeAssignmentMenu = () => setOpenAssignmentMenuId(null);
        document.addEventListener("click", closeAssignmentMenu);
        window.addEventListener("scroll", closeAssignmentMenu, true);
        window.addEventListener("resize", closeAssignmentMenu);
        return () => {
            document.removeEventListener("click", closeAssignmentMenu);
            window.removeEventListener("scroll", closeAssignmentMenu, true);
            window.removeEventListener("resize", closeAssignmentMenu);
        };
    }, [openAssignmentMenuId]);

    // The one action a row shows: review a return, complete, or ask for an update
    function renderAssignmentPrimaryAction(assignment) {
        if (assignment.status !== "active") return null;
        if (assignment.returnRequest?.status === "pending") {
            return (
                <button type="button" className="afl-return-btn" onClick={() => openEarlyReturn(assignment)}>
                    Review return
                </button>
            );
        }
        if (assignment.behaviorEvaluation?.status === "accepted") {
            return (
                <button
                    type="button"
                    className="afl-ask-btn is-complete"
                    title="End this foster assignment now"
                    onClick={() => handleCompleteAssignment(assignment)}
                >
                    Complete
                </button>
            );
        }
        return renderAskForUpdateButton(assignment);
    }

    function renderAskForUpdateButton(assignment) {
        return (
            <button
                type="button"
                className="afl-ask-btn"
                disabled={askedInLastDay(assignment) || requestingUpdateId === assignment._id}
                title={
                    askedInLastDay(assignment)
                        ? "Already asked in the last 24 hours"
                        : "Send the foster a notification and email asking for a weekly update"
                }
                onClick={() => handleRequestUpdate(assignment)}
            >
                {requestingUpdateId === assignment._id
                    ? "Asking…"
                    : askedInLastDay(assignment)
                      ? "Asked"
                      : "Ask for update"}
            </button>
        );
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
                                Review <Icon name="arrow-right" />
                            </button>
                        )}
                    </div>

                    <div className="ao-strip-item">
                        <div className="ao-strip-label">
                            <StatIcon name="check" />
                            Approved fosters
                        </div>
                        <div className="ao-strip-value">
                            {approvedFosters}
                            <em>{totalSlots} {totalSlots === 1 ? "slot" : "slots"} total</em>
                        </div>
                    </div>

                    <div className="ao-strip-item">
                        <div className="ao-strip-label">
                            <StatIcon name="home" />
                            Active assignments
                        </div>
                        <div className="ao-strip-value">
                            {activeAssignments}
                            <em>of {totalSlots} {totalSlots === 1 ? "slot" : "slots"}</em>
                        </div>
                    </div>

                    <div className={`ao-strip-item ${openMedicalRequests > 0 ? "is-alert" : ""}`}>
                        <div className="ao-strip-label">
                            <StatIcon name="heart" />
                            Medical requests
                        </div>
                        <div className="ao-strip-value">
                            {openMedicalRequests}
                            <em>open</em>
                        </div>
                    </div>
                </div>
            </div>
    <div className="afc-layout">
        <div className="afc-main">
            <section className="admin-panel admin-foster-list-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>
                            Current foster assignments
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
                        {loading ? "Refreshing…" : "Refresh"}
                    </button>
                </div>

                <div className="afl-toolbar">
                    <label className="afl-search">
                        <StatIcon name="search" />
                        <input aria-label="Search pet or foster"
                            type="search"
                            value={listSearch}
                            onChange={(event) => setListSearch(event.target.value)}
                            placeholder="Search pet or foster…"
                        />
                    </label>

                    <div className="afl-filters" role="tablist" aria-label="Filter assignments">
                        {LIST_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                type="button"
                                role="tab"
                                aria-selected={listFilter === filter.value}
                                className={listFilter === filter.value ? "is-active" : ""}
                                onClick={() => setListFilter(filter.value)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && assignments.length === 0 ? (
                    <LoadingState label="Loading assignments…" />
                ) : visibleAssignments.length === 0 ? (
                    <p className="admin-empty">
                        {assignments.length === 0
                            ? "No foster assignments yet."
                            : "No assignments match your search."}
                    </p>
                ) : (
                    <div className="afl-table">
                        <div className="afl-head" aria-hidden="true">
                            <span>Pet</span>
                            <span>Foster</span>
                            <span>Status</span>
                            <span>Action</span>
                            <span />
                        </div>

                        {visibleAssignments.map((assignment, index) => (
                            <article
                                className={`afl-item ${assignment.behaviorEvaluation?.status === "pending" || assignment.returnRequest?.status === "pending" || hasUnseenUpdates(assignment) ? "is-new" : ""}`}
                                key={assignment._id}
                            >
                                {/* Click anywhere on the row (except its buttons) to open the details card */}
                                <div
                                    className="afl-row is-clickable"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Open ${assignment.petName}'s foster details`}
                                    onClick={(event) => {
                                        if (event.target.closest("button")) return;
                                        setViewingAssignmentId(assignment._id);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.target !== event.currentTarget) return;
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            setViewingAssignmentId(assignment._id);
                                        }
                                    }}
                                >
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
                                            <small className="afl-breed">{assignment.petBreed || "Unknown breed"}</small>
                                            <small className="afl-foster-inline">{assignment.fosterName}</small>
                                        </div>
                                    </div>

                                    <div className="afl-foster">
                                        <b>{assignment.fosterName}</b>
                                        <small>{assignment.fosterEmail}</small>
                                    </div>

                                    <div className="afl-cell afl-status-cell">
                                        <span className={`afl-status is-${assignment.status}`}>
                                            {assignment.status}
                                        </span>
                                        {assignment.returnRequest?.status === "pending" ? (
                                            <span className="afl-flag is-return">
                                                Return requested{assignment.returnRequest.urgent ? " · Urgent" : ""}
                                            </span>
                                        ) : assignment.behaviorEvaluation?.status === "pending" ? (
                                            <span className="afl-flag is-due">Evaluation to review</span>
                                        ) : hasUnseenUpdates(assignment) ? (
                                            <span className="afl-flag is-due">New weekly update</span>
                                        ) : weeklyUpdateIsDue(assignment) ? (
                                            <span className="afl-flag is-due">Update due</span>
                                        ) : null}
                                    </div>

                                    <div className="afl-actions">
                                        {renderAssignmentPrimaryAction(assignment)}
                                    </div>

                                    <div className="afl-menu-cell">
                                        {assignment.status === "active" && (
                                            <button
                                                type="button"
                                                className="afl-menu-btn"
                                                aria-label={`More actions for ${assignment.petName}`}
                                                aria-haspopup="menu"
                                                aria-expanded={openAssignmentMenuId === assignment._id}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    const rect = event.currentTarget.getBoundingClientRect();
                                                    setOpenAssignmentMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                                    setOpenAssignmentMenuId(openAssignmentMenuId === assignment._id ? null : assignment._id);
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                    <circle cx="5" cy="12" r="2" />
                                                    <circle cx="12" cy="12" r="2" />
                                                    <circle cx="19" cy="12" r="2" />
                                                </svg>
                                            </button>
                                        )}
                                        {openAssignmentMenuId === assignment._id && (
                                            <span
                                                className="afl-menu"
                                                role="menu"
                                                style={{ top: openAssignmentMenuPosition.top, right: openAssignmentMenuPosition.right }}
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => {
                                                        setOpenAssignmentMenuId(null);
                                                        handleEditAssignment(assignment);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    className="is-danger"
                                                    onClick={() => {
                                                        setOpenAssignmentMenuId(null);
                                                        handleDeleteAssignment(assignment._id);
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section id="foster-applications" className="admin-panel afa-panel">
                <div className="afa-heading">
                    <div>
                        <h2>
                            Foster Applications
                            {newApplicationCount > 0 && (
                                <span className="afc-new">{newApplicationCount} new</span>
                            )}
                        </h2>
                        <p>Review caregivers, then assign animals to approved fosters.</p>
                    </div>

                    <div className="afl-filters">
                        {APP_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                type="button"
                                className={appFilter === filter.value ? "is-active" : ""}
                                onClick={() => setAppFilter(filter.value)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {newApplicationCount > 0 && (
                    <div className="afa-new-banner" role="status">
                        <span className="afa-new-dot" aria-hidden="true" />
                        <p>
                            <b>
                                {newApplicationCount === 1
                                    ? "1 new or updated foster application"
                                    : `${newApplicationCount} new or updated foster applications`}
                            </b>
                            {" "}to review.
                        </p>
                        <button type="button" onClick={markAllAppsSeen}>
                            Mark all as seen
                        </button>
                    </div>
                )}

                <div className="afa-list">
                        {visibleApplications.length > 0 && (
                        <div className="afa-head" aria-hidden="true">
                            <span />
                            <span>Applicant</span>
                            <span>Preferences</span>
                            <span>Status</span>
                            <span className="afl-right">Actions</span>
                        </div>
                    )}
                    {visibleApplications.length === 0 ? (
                        <p className="afc-empty">
                            {appFilter === "all"
                                ? "No foster applications yet."
                                : `No ${appFilter} applications.`}
                        </p>
                    ) : (
                        visibleApplications.map((application) => {
                            const full = application.status === "approved" && isFosterFull(application);
                            const isNew = newApplicationIds.includes(application._id);

                            return (
                                <article className={`afa-row ${isNew ? "is-new" : ""}`} key={application._id}>
                                    <span className="afc-initials" aria-hidden="true">
                                        {getInitials(application.applicantName)}
                                    </span>

                                    <div className="afa-person">
                                        <b>{application.applicantName}
                                            {isNew && (
                                                <span className="afa-new-tag">
                                                    {hasPendingCapacityRequest(application)
                                                        ? `Wants ${application.capacityRequest.requestedCapacity}`
                                                        : application.lastEditedAt ? "Updated" : "New"}
                                                </span>
                                            )}
                                        </b>
                                        <small>{application.applicantEmail}</small>
                                    </div>

                                    <div className="afa-chips">
                                        <span>
                                            Capacity {application.capacity || 1}
                                            {hasPendingCapacityRequest(application) &&
                                                ` → ${application.capacityRequest.requestedCapacity} asked`}
                                        </span>
                                        <span>
                                            Prefers{" "}
                                            {PREFERS_LABEL[application.preferredAnimalType] ||
                                                application.preferredAnimalType ||
                                                "Any"}
                                        </span>
                                    </div>

                                    <span className={`afa-status is-${application.status}`}>
                                        {application.status}
                                    </span>

                                    <div className="afa-actions">
                                        <button
                                            type="button"
                                            className="afa-review"
                                            onClick={() => { 
                                                markAppSeen(application);
                                                setReviewingApplication(application)}
                                            }
                                        >
                                            Review
                                        </button>

                                        {application.status !== "approved" ? (
                                            <button type="button" className="afa-assign" disabled>
                                                Assign
                                            </button>
                                        ) : full ? (
                                            <button type="button" className="afa-assign is-full" disabled>
                                                Full
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="afa-assign"
                                                onClick={() => startAssign(application)}
                                            >
                                                Assign
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </section>

            {viewedAssignment && (() => {
                // Every weekly report, newest first, so staff can look back
                const weeklyUpdates = [...(viewedAssignment.updates || [])].sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                );
                const careInstructions = String(viewedAssignment.careInstructions || "")
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean);
                const returnRequest = viewedAssignment.returnRequest;
                const openMedicalRequests = (viewedAssignment.medicalRequests || []).filter((request) => request.status !== "resolved");
                const isActive = viewedAssignment.status === "active";
                const primaryAction = renderAssignmentPrimaryAction(viewedAssignment);
                const primaryIsAskForUpdate =
                    isActive && returnRequest?.status !== "pending" && viewedAssignment.behaviorEvaluation?.status !== "accepted";

                return (
                    <div className="admin-modal-overlay afd-overlay" onClick={() => setViewingAssignmentId(null)}>
                        <section
                            className="afd-card"
                            role="dialog"
                            aria-modal="true"
                            aria-label={`${viewedAssignment.petName} foster details`}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <header className="afd-head">
                                <span className="afl-avatar is-orange">
                                    {viewedAssignment.petImage ? (
                                        <img src={viewedAssignment.petImage} alt="" />
                                    ) : (
                                        <StatIcon name="paw" size={24} />
                                    )}
                                </span>
                                <div>
                                    <h3>{viewedAssignment.petName}</h3>
                                    <small>{viewedAssignment.petBreed || "Unknown breed"} · fostered by {viewedAssignment.fosterName}</small>
                                </div>
                                <button type="button" className="afd-close" aria-label="Close" onClick={() => setViewingAssignmentId(null)}>
                                    &times;
                                </button>
                            </header>

                            <div className="afd-section">
                                <dl className="afd-grid">
                                    <div><dt>Status</dt><dd className="afd-capitalize">{viewedAssignment.status}</dd></div>
                                    <div><dt>Foster</dt><dd>{viewedAssignment.fosterName}<small>{viewedAssignment.fosterEmail}</small></dd></div>
                                    <div><dt>Started</dt><dd>{formatDate(viewedAssignment.startDate)}</dd></div>
                                    <div><dt>Planned end</dt><dd>{viewedAssignment.endDate ? formatDate(viewedAssignment.endDate) : "—"}</dd></div>
                                    <div>
                                        <dt>Updates</dt>
                                        <dd>
                                            {viewedAssignment.updates?.length || 0}
                                            {lastUpdateDate(viewedAssignment) ? ` · last ${formatShortDate(lastUpdateDate(viewedAssignment))}` : ""}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Next update</dt>
                                        <dd className={weeklyUpdateIsDue(viewedAssignment) ? "is-due" : ""}>
                                            {!isActive ? "—" : weeklyUpdateIsDue(viewedAssignment) ? "Due now" : "Not due yet"}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            {returnRequest?.status === "pending" && (
                                <div className="afd-section">
                                    <div className="afd-alert">
                                        <b>Return requested{returnRequest.urgent ? " · Urgent" : ""}</b>
                                        {returnRequest.reason ? ` · ${returnRequest.reason}` : ""}
                                        {returnRequest.preferredDate ? ` · preferred ${formatShortDate(returnRequest.preferredDate)}` : ""}
                                        {returnRequest.notes && <p>"{returnRequest.notes}"</p>}
                                    </div>
                                </div>
                            )}

                            {openMedicalRequests.length > 0 && (
                                <div className="afd-section">
                                    <h4>Open medical requests</h4>
                                    <ul className="afd-list">
                                        {openMedicalRequests.map((request) => (
                                            <li key={request._id}>
                                                {request.issueType || "Concern"} · {request.urgency || "Normal"} · {request.status === "in_progress" ? "In progress" : "Pending"}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="afd-section">
                                <h4>Weekly updates{weeklyUpdates.length ? ` · ${weeklyUpdates.length}` : ""}</h4>
                                {weeklyUpdates.length === 0 ? (
                                    <p className="afd-text">No updates yet.</p>
                                ) : (
                                    <ol className="afd-updates">
                                        {weeklyUpdates.map((update) => {
                                            const isNew = newUpdateIds.includes(update._id);
                                            const facts = [
                                                update.healthStatus && `${update.healthStatus} health`,
                                                update.appetite && `${update.appetite} appetite`,
                                                update.behavior,
                                                update.weight != null && `${update.weight} kg`,
                                                update.medication && "Medication given",
                                                update.exercise && "Exercise done",
                                            ].filter(Boolean);

                                            return (
                                                <li key={update._id} className={`afd-update${isNew ? " is-new" : ""}`}>
                                                    <div className="afd-update-body">
                                                        <b>
                                                            {formatDateTime(update.createdAt)}
                                                            {isNew && <span className="afd-new">New</span>}
                                                        </b>
                                                        {facts.length > 0 && (
                                                            <span className="afd-update-tags">
                                                                {facts.map((fact) => <span key={fact}>{fact}</span>)}
                                                            </span>
                                                        )}
                                                        <p>{update.note || "No note added."}</p>
                                                    </div>
                                                    {update.photoUrl && (
                                                        <a className="afd-update-photo" href={update.photoUrl} target="_blank" rel="noreferrer" title="Open photo">
                                                            <img src={update.photoUrl} alt={`Update photo, ${formatShortDate(update.createdAt)}`} />
                                                        </a>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ol>
                                )}
                            </div>

                            {careInstructions.length > 0 && (
                                <div className="afd-section">
                                    <h4>Care instructions</h4>
                                    <ul className="afd-list">
                                        {careInstructions.map((line, lineIndex) => (
                                            <li key={lineIndex}>{line}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="afd-section afl-item">
                                <h4>Behavior evaluation</h4>
                                {viewedAssignment.behaviorEvaluation?.status === "pending" ? (
                                    <div className="admin-foster-behavior-review">
                                        <div className="admin-foster-behavior-heading">
                                            <strong>Behavioral Evaluation</strong>
                                            <span>Pending review</span>
                                        </div>

                                        <div className="admin-foster-behavior-grid">
                                            <div>
                                                <strong>Energy Level</strong>
                                                <span>{viewedAssignment.behaviorEvaluation.energyLevel}/5</span>
                                            </div>
                                            <div>
                                                <strong>Friendliness</strong>
                                                <span>{viewedAssignment.behaviorEvaluation.friendliness}/5</span>
                                            </div>
                                            <div>
                                                <strong>Human Sociability</strong>
                                                <span>{viewedAssignment.behaviorEvaluation.humanSociability}/5</span>
                                            </div>
                                            <div>
                                                <strong>Animal Sociability</strong>
                                                <span>{viewedAssignment.behaviorEvaluation.animalSociability}/5</span>
                                            </div>
                                            <div>
                                                <strong>Trainability</strong>
                                                <span>{viewedAssignment.behaviorEvaluation.trainability}/5</span>
                                            </div>
                                            <div>
                                                <strong>Anxiety Level</strong>
                                                <span>{viewedAssignment.behaviorEvaluation.anxietyLevel}/5</span>
                                            </div>
                                            <div>
                                                <strong>Aggression Level</strong>
                                                <span>{viewedAssignment.behaviorEvaluation.aggressionLevel}/5</span>
                                            </div>
                                            <div>
                                                <strong>Activity Level</strong>
                                                <span>{viewedAssignment.behaviorEvaluation.activityLevel}/5</span>
                                            </div>
                                        </div>

                                        {viewedAssignment.behaviorEvaluation.notes && (
                                            <div className="admin-foster-behavior-notes">
                                                <strong>Foster notes</strong>
                                                <p>{viewedAssignment.behaviorEvaluation.notes}</p>
                                            </div>
                                        )}

                                        <div className="admin-foster-behavior-meta">
                                            <span>
                                                Submitted by:{" "}
                                                {viewedAssignment.behaviorEvaluation.submittedBy || viewedAssignment.fosterName}
                                            </span>

                                            {viewedAssignment.behaviorEvaluation.submittedAt && (
                                                <span>
                                                    Submitted:{" "}
                                                    {formatDate(viewedAssignment.behaviorEvaluation.submittedAt)}
                                                </span>
                                            )}
                                        </div>

                                        {returningId === viewedAssignment._id ? (
                                            <div className="afl-eval-return">
                                                <label className="afr-reason">
                                                    <span>
                                                        What should the foster fix? <em>(shown to the foster)</em>
                                                    </span>
                                                    <textarea
                                                        rows="2"
                                                        value={returnReason}
                                                        onChange={(e) => {
                                                            setReturnReason(e.target.value);
                                                            setReturnError("");
                                                        }}
                                                        placeholder="e.g. Aggression looks too high compared to the shelter notes. Please re-check."
                                                        maxLength={300}
                                                    />
                                                    {returnError && <small className="afr-reason-error">{returnError}</small>}
                                                </label>

                                                <div className="afl-eval-actions">
                                                    <button
                                                        type="button"
                                                        className="is-ghost"
                                                        onClick={() => setReturningId(null)}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReturnBehaviorEvaluation(viewedAssignment._id)}
                                                    >
                                                        Send back
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="afl-eval-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAcceptBehaviorEvaluation(viewedAssignment._id)}
                                                >
                                                    Accept evaluation
                                                </button>
                                                <button
                                                    type="button"
                                                    className="is-ghost"
                                                    onClick={() => startReturn(viewedAssignment._id)}
                                                >
                                                    Send back for revision
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="afd-text">{BEHAVIOR_EVALUATION_LABEL[viewedAssignment.behaviorEvaluation?.status] || "Not submitted yet"}</p>
                                )}
                            </div>

                            {isActive && (
                                <footer className="afd-foot">
                                    {primaryAction && <span className="afd-primary">{primaryAction}</span>}
                                    {!primaryIsAskForUpdate && renderAskForUpdateButton(viewedAssignment)}
                                    <button
                                        type="button"
                                        className="afd-btn"
                                        onClick={() => {
                                            setViewingAssignmentId(null);
                                            handleEditAssignment(viewedAssignment);
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className="afd-btn is-danger"
                                        onClick={async () => {
                                            await handleDeleteAssignment(viewedAssignment._id);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </footer>
                            )}
                        </section>
                    </div>
                );
            })()}

            {reviewingApplication && (
                <div
                    className="admin-modal-overlay"
                    onClick={() => setReviewingApplication(null)}
                >
                    <div
                        className="afr-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Review ${reviewingApplication.applicantName}`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        {/* Header */}
                        <header className="afr-head">
                            <span className="afr-avatar" aria-hidden="true">
                                {getInitials(reviewingApplication.applicantName)}
                            </span>

                            <div className="afr-who">
                                <h2>{reviewingApplication.applicantName}</h2>
                                <small>
                                    <StatIcon name="mail" size={14} />
                                    {reviewingApplication.applicantEmail}
                                </small>
                            </div>

                            <span className={`afr-pill is-${reviewingApplication.status}`}>
                                <i aria-hidden="true" />
                                {reviewingApplication.status === "pending"
                                    ? "Pending review"
                                    : reviewingApplication.status}
                            </span>

                            <button
                                type="button"
                                className="afr-close"
                                onClick={() => setReviewingApplication(null)}
                                aria-label="Close"
                            >
                                <StatIcon name="x" size={16} />
                            </button>
                        </header>

                        {/* Body */}
                        <div className="afr-body">
                            {hasPendingCapacityRequest(reviewingApplication) && (
                                <div className="afr-capacity-request">
                                    <div>
                                        <b>
                                            Wants to foster up to {reviewingApplication.capacityRequest.requestedCapacity} animals
                                            (now {reviewingApplication.capacity || 1})
                                        </b>
                                        <span>
                                            Asked on {formatDate(reviewingApplication.capacityRequest.requestedAt)}
                                            {reviewingApplication.capacityRequest.reason
                                                ? `: "${reviewingApplication.capacityRequest.reason}"`
                                                : ". No reason given."}
                                        </span>
                                    </div>
                                    <div className="afr-capacity-request-actions">
                                        <button
                                            type="button"
                                            className="afr-btn is-reject"
                                            onClick={() => decideCapacityRequest(reviewingApplication, "declined")}
                                        >
                                            Decline
                                        </button>
                                        <button
                                            type="button"
                                            className="afr-btn is-approve"
                                            onClick={() => decideCapacityRequest(reviewingApplication, "approved")}
                                        >
                                            <StatIcon name="check" size={16} />
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            )}
                            {reviewingApplication.lastEditedAt &&
                                reviewingApplication.editedFields?.length > 0 && (
                                <p className="afr-note is-updated">
                                    <StatIcon name="info" size={16} />
                                    <span>
                                        Updated by the applicant on{" "}
                                        {formatDate(reviewingApplication.lastEditedAt)}
                                        : <b>{reviewingApplication.editedFields.join(", ")}</b>
                                    </span>
                                </p>
                            )}
                            <div className="afr-facts">
                                <div className="afr-fact">
                                    <span className="afr-fact-icon">
                                        <img src="/icons/User-brown.svg" alt="" />
                                    </span>
                                    <div>
                                        <small>Requested role</small>
                                        <b>Foster</b>
                                    </div>
                                </div>

                                <div className="afr-fact">
                                    <span className="afr-fact-icon">
                                        <StatIcon name="calendar" size={16} />
                                    </span>
                                    <div>
                                        <small>Applied on</small>
                                        <b>
                                            {reviewingApplication.createdAt
                                                ? formatDate(reviewingApplication.createdAt)
                                                : "—"}
                                        </b>
                                    </div>
                                </div>

                                <div className="afr-fact">
                                    <span className="afr-fact-icon">
                                        <StatIcon name="home" size={16} />
                                    </span>
                                    <div>
                                        <small>Capacity</small>
                                        <b>
                                            {reviewingApplication.capacity || 1}{" "}
                                            {(reviewingApplication.capacity || 1) === 1 ? "animal" : "animals"}
                                        </b>
                                    </div>
                                </div>

                                <div className="afr-fact">
                                    <span className="afr-fact-icon">
                                        <StatIcon name="paw" size={16} />
                                    </span>
                                    <div>
                                        <small>Prefers</small>
                                        <b>
                                            {PREFERS_LABEL[reviewingApplication.preferredAnimalType] ||
                                                reviewingApplication.preferredAnimalType ||
                                                "Any"}
                                        </b>
                                    </div>
                                </div>
                            </div>

                            <div className="afr-why">
                                <h3>Why they want to foster</h3>
                                <p>
                                    {reviewingApplication.notes ||
                                        reviewingApplication.fosterExperience ||
                                        "No reason given."}
                                </p>
                            </div>

                            {/* Everything else from the application, folded away */}
                            <details className="afr-more">
                                <summary>Full application details</summary>

                                <div className="afa-detail-grid">
                                    <p className="afa-detail-full">
                                        <span>Experience</span>
                                        {reviewingApplication.fosterExperience || "—"}
                                    </p>
                                    <p><span>Phone</span>{reviewingApplication.phoneNumber ? `+63 ${reviewingApplication.phoneNumber}` : "—"}</p>
                                    <p><span>Address</span>{reviewingApplication.address || "—"}</p>
                                    <p><span>Housing</span>{reviewingApplication.housingType || "—"}</p>
                                    <p><span>Pet-friendly home</span>{yesNo(reviewingApplication.petFriendly)}</p>
                                    <p><span>Has pets</span>{yesNo(reviewingApplication.hasPets)}</p>
                                    <p><span>Has children</span>{yesNo(reviewingApplication.hasChildren)}</p>
                                    <p><span>Duration</span>{reviewingApplication.fosterDuration || "—"}</p>
                                    <p><span>Preferred size</span>{reviewingApplication.preferredSize || "—"}</p>
                                    <p><span>Emergency contact</span>{reviewingApplication.emergencyName || "—"}
                                        {reviewingApplication.emergencyRelationship
                                            ? ` (${reviewingApplication.emergencyRelationship})`
                                            : ""}
                                    </p>
                                    <p>
                                        <span>Emergency phone</span>
                                        {reviewingApplication.emergencyPhone ? `+63 ${reviewingApplication.emergencyPhone}` : "—"}
                                    </p>
                                    
                                </div>
                            </details>

                            {reviewingApplication.status === "pending" && (
                                <label className="afr-reason">
                                    <span>
                                        Reason for rejection <em>(needed only to reject, shown to the applicant)</em>
                                    </span>
                                    <textarea
                                        rows={3}
                                        maxLength={300}
                                        value={rejectNote}
                                        onChange={(event) => {
                                            setRejectNote(event.target.value);
                                            setRejectError("");
                                        }}
                                        placeholder="e.g. Your building does not allow pets."
                                    />
                                    {rejectError && <small className="afr-reason-error">{rejectError}</small>}
                                </label>
                            )}

                            {reviewingApplication.status === "rejected" && reviewingApplication.rejectionReason && (
                                <p className="afr-reason-shown">
                                    <b>Rejection reason:</b> {reviewingApplication.rejectionReason}
                                </p>
                            )}

                            <p className={`afr-note is-${reviewingApplication.status}`}>
                                <StatIcon name="info" size={16} />
                                {reviewingApplication.status === "approved"
                                    ? `${reviewingApplication.applicantName.split(" ")[0]} is an approved foster. Use Assign in the list to place an animal.`
                                    : reviewingApplication.status === "withdrawn"
                                        ? `${reviewingApplication.applicantName.split(" ")[0]} withdrew this application, so it can't be approved or rejected. They can submit a new one.`
                                    : reviewingApplication.status === "rejected"
                                        ? "This application was rejected. Approving it now will make them an approved foster."
                                        : `Approving makes ${reviewingApplication.applicantName.split(" ")[0]} an approved foster. You can then assign animals from the list.`}
                            </p>
                        </div>

                        {/* Footer */}
                        <footer className="afr-foot">
                            <button
                                type="button"
                                className="afr-btn is-ghost"
                                onClick={() => setReviewingApplication(null)}
                            >
                                Close
                            </button>

                            <div className="afr-foot-actions">
                                {reviewingApplication.status === "pending" && (
                                    <button
                                        type="button"
                                        className="afr-btn is-reject"
                                        onClick={() => decideFromReview("rejected")}
                                    >
                                        Reject
                                    </button>
                                )}

                                {["pending", "rejected"].includes(reviewingApplication.status) && (
                                    <button
                                        type="button"
                                        className="afr-btn is-approve"
                                        onClick={() => decideFromReview("approved")}
                                    >
                                        <StatIcon name="check" size={16} />
                                        Approve
                                    </button>
                                )}
                            </div>
                        </footer>
                    </div>
                </div>
            )}
            
            {assigningApplication && (
                <div
                    className="admin-modal-overlay"
                    onClick={closeAssign}
                >
                    <form
                        className="afr-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Assign an animal to ${assigningApplication.applicantName}`}
                        onClick={(event) => event.stopPropagation()}
                        onSubmit={handleCreateAssignment}
                    >
                        {/* Header */}
                        <header className="afr-head">
                            <span className="afr-avatar" aria-hidden="true">
                                {getInitials(assigningApplication.applicantName)}
                            </span>

                            <div className="afr-who">
                                <h2>{assigningApplication.applicantName}</h2>
                                <small>
                                    <StatIcon name="mail" size={14} />
                                    {assigningApplication.applicantEmail}
                                </small>
                            </div>

                            <span className="afr-pill is-approved is-slots">
                                <i aria-hidden="true" />
                                {activeCountByEmail[assigningApplication.applicantEmail] || 0} of{" "}
                                {assigningApplication.capacity || 1} slots used
                            </span>

                            <button
                                type="button"
                                className="afr-close"
                                onClick={closeAssign}
                                aria-label="Close"
                            >
                                <StatIcon name="x" size={16} />
                            </button>
                        </header>

                        {/* Body */}
                        <div className="afr-body">
                            <div className="afr-facts is-three">
                                <div className="afr-fact">
                                    <span className="afr-fact-icon">
                                        <StatIcon name="home" size={16} />
                                    </span>
                                    <div>
                                        <small>Capacity</small>
                                        <b>
                                            {assigningApplication.capacity || 1}{" "}
                                            {(assigningApplication.capacity || 1) === 1 ? "animal" : "animals"}
                                        </b>
                                    </div>
                                </div>

                                <div className="afr-fact">
                                    <span className="afr-fact-icon">
                                        <StatIcon name="paw" size={16} />
                                    </span>
                                    <div>
                                        <small>Prefers</small>
                                        <b>
                                            {PREFERS_LABEL[assigningApplication.preferredAnimalType] ||
                                                assigningApplication.preferredAnimalType ||
                                                "Any"}
                                        </b>
                                    </div>
                                </div>

                                <div className="afr-fact">
                                    <span className="afr-fact-icon">
                                        <StatIcon name="calendar" size={16} />
                                    </span>
                                    <div>
                                        <small>Duration</small>
                                        <b>{assigningApplication.fosterDuration || "—"}</b>
                                    </div>
                                </div>
                            </div>

                            <div className="afr-form">
                                {(() => {
                                    const prefers = assigningApplication.preferredAnimalType;
                                    const fits = (animal) =>
                                        !prefers || prefers === "Both" ? true : animal.type === prefers;
                                    const matchingCount = animals.filter(fits).length;
                                    const scope = matchingCount === 0 ? "all" : petScope;
                                    const query = petSearch.trim().toLowerCase();
                                    const shown = animals.filter(
                                        (animal) =>
                                            (scope === "all" || fits(animal)) &&
                                            (!query ||
                                                `${animal.name} ${animal.breed || ""} ${animal.type || ""}`
                                                    .toLowerCase()
                                                    .includes(query))
                                    );

                                    return (
                                        <div className="is-wide afr-picker">
                                            <span className="acl-label">
                                                Pick a pet <span className="required-mark">*</span>
                                            </span>

                                            <div className="afr-picker-tools">
                                                <input aria-label="Search name or breed"
                                                    type="search"
                                                    value={petSearch}
                                                    placeholder="Search name or breed…"
                                                    onChange={(event) => setPetSearch(event.target.value)}
                                                />
                                                <div className="afr-picker-chips">
                                                    <button
                                                        type="button"
                                                        className={scope === "match" ? "is-on" : ""}
                                                        disabled={matchingCount === 0}
                                                        onClick={() => setPetScope("match")}
                                                    >
                                                        Matches preference ({matchingCount})
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={scope === "all" ? "is-on" : ""}
                                                        onClick={() => setPetScope("all")}
                                                    >
                                                        All available ({animals.length})
                                                    </button>
                                                </div>
                                            </div>

                                            {animalsLoading ? (
                                                <LoadingState label="Loading pets…" />
                                            ) : shown.length === 0 ? (
                                                <p className="afr-picker-empty">
                                                    {animals.length ? "No pets match your search." : "No pets available for foster."}
                                                </p>
                                            ) : (
                                                <div className="afr-picker-grid" role="radiogroup" aria-label="Pet">
                                                    {shown.map((animal) => {
                                                        const selected = assignmentForm.animalId === animal._id;
                                                        return (
                                                            <button
                                                                key={animal._id}
                                                                type="button"
                                                                role="radio"
                                                                aria-checked={selected}
                                                                className={`afr-pick${selected ? " is-selected" : ""}`}
                                                                onClick={() => pickAnimal(animal._id)}
                                                            >
                                                                <span className="afr-pick-photo">
                                                                    {animal.image ? (
                                                                        <img src={animal.image} alt="" />
                                                                    ) : (
                                                                        <StatIcon name="paw" size={22} />
                                                                    )}
                                                                </span>
                                                                <span className="afr-pick-text">
                                                                    <b>{animal.name}</b>
                                                                    <small>
                                                                        {[animal.type, animal.breed, animal.size !== "Unknown" ? animal.size : ""]
                                                                            .filter(Boolean)
                                                                            .join(" · ")}
                                                                    </small>
                                                                    {fits(animal) && prefers && prefers !== "Both" && (
                                                                        <span className="afr-pick-match">Matches</span>
                                                                    )}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {(() => {
                                    const pet = animals.find((animal) => animal._id === assignmentForm.animalId);
                                    if (!pet) return null;

                                    const tags = [
                                        pet.type,
                                        pet.age ? `${pet.age} ${pet.age === 1 ? "yr" : "yrs"}` : "",
                                        pet.gender !== "Unknown" ? pet.gender : "",
                                        pet.size !== "Unknown" ? pet.size : "",
                                        pet.color,
                                    ].filter(Boolean);

                                    return (
                                        <div className="afr-pet">
                                            <span className="afr-pet-photo">
                                                {pet.image ? <img src={pet.image} alt={pet.name} /> : <StatIcon name="paw" size={26} />}
                                            </span>

                                            <div className="afr-pet-info">
                                                <b>{pet.name}</b>
                                                <small>{pet.breed || "Unknown breed"}</small>
                                                <div className="afr-pet-tags">
                                                    {tags.map((tag) => <span key={tag}>{tag}</span>)}
                                                </div>
                                            </div>

                                            <dl className="afr-pet-notes">
                                                <div>
                                                    <dt>Medical</dt>
                                                    <dd>{pet.medicalStatus || "No notes"}</dd>
                                                </div>
                                                <div>
                                                    <dt>Behavior</dt>
                                                    <dd>{pet.behaviorNotes || "No notes"}</dd>
                                                </div>
                                            </dl>
                                        </div>
                                    );
                                })()}

                            <div className="is-wide afr-dates">
                                <label>
                                    <span>Start date</span>
                                    <input
                                        type="date"
                                        value={assignmentForm.startDate}
                                        onChange={(event) =>
                                            setAssignmentForm((form) => ({ ...form, startDate: event.target.value }))
                                        }
                                        required
                                    />
                                </label>
                                <label>
                                    <span>Expected end (optional)</span>
                                    <input
                                        type="date"
                                        value={assignmentForm.endDate}
                                        min={assignmentForm.startDate ? addDays(assignmentForm.startDate, 1) : undefined}
                                        onChange={(event) =>
                                            setAssignmentForm((form) => ({ ...form, endDate: event.target.value }))
                                        }
                                    />
                                </label>
                                <div className="afr-lengths">
                                    <span>Quick pick</span>
                                    <div>
                                        {FOSTER_LENGTHS.map((length) => (
                                            <button
                                                key={length.label}
                                                type="button"
                                                disabled={!assignmentForm.startDate}
                                                onClick={() =>
                                                    setAssignmentForm((form) => ({
                                                        ...form,
                                                        endDate: addDays(form.startDate, length.days),
                                                    }))
                                                }
                                            >
                                                {length.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="is-wide acl-field">
                                <span className="acl-label">
                                    Care instructions
                                    <InfoTip text="Press Enter for a new line. The foster sees each line as a checklist item." />
                                </span>
                                <CareChecklistInput
                                    value={assignmentForm.careInstructions}
                                    onChange={(text) =>
                                        setAssignmentForm((form) => ({ ...form, careInstructions: text }))
                                    }
                                />
                            </div>
                            </div>

                            {message ? (
                                <p className="afr-note is-rejected">
                                    <StatIcon name="info" size={16} />
                                    {message}
                                </p>
                            ) : (
                                <p className="afr-note is-approved">
                                    <StatIcon name="info" size={16} />
                                    {assigningApplication.applicantName.split(" ")[0]} will get an email and a
                                    notification with the care instructions.
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <footer className="afr-foot">
                            <button type="button" className="afr-btn is-ghost" onClick={closeAssign}>
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="afr-btn is-assign"
                                disabled={submitting}
                            >
                                <StatIcon name="paw" size={16} />
                                {submitting
                                    ? "Assigning…"
                                    : assignmentForm.petName
                                        ? `Assign ${assignmentForm.petName}`
                                        : "Assign Foster"}
                            </button>
                        </footer>
                    </form>
                </div>
            )}

            {editingId && (() => {
                const editing = assignments.find((item) => item._id === editingId) || {};
                const pet = animals.find((animal) => String(animal._id) === String(assignmentForm.animalId));

                return (
                    <div className="admin-modal-overlay" onClick={handleCancelEdit}>
                        <form
                            className="afr-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-label={`Edit ${editing.petName || "foster"} assignment`}
                            onClick={(event) => event.stopPropagation()}
                            onSubmit={handleUpdateAssignment}
                        >
                            {/* Header */}
                            <header className="afr-head">
                                <span className="afr-avatar" aria-hidden="true">
                                    {getInitials(editing.fosterName || "")}
                                </span>

                                <div className="afr-who">
                                    <h2>{editing.fosterName}</h2>
                                    <small>
                                        <StatIcon name="mail" size={14} />
                                        {editing.fosterEmail}
                                    </small>
                                </div>

                                <span className="afr-pill is-approved">
                                    <i aria-hidden="true" />
                                    Active
                                </span>

                                <button
                                    type="button"
                                    className="afr-close"
                                    onClick={handleCancelEdit}
                                    aria-label="Close"
                                >
                                    <StatIcon name="x" size={16} />
                                </button>
                            </header>

                            {/* Body */}
                            <div className="afr-body">
                                <div className="afr-form">
                                    <label className="is-wide">
                                        <span>Animal <span className="required-mark">*</span></span>
                                        <select
                                            value={assignmentForm.animalId}
                                            onChange={(e) => pickAnimal(e.target.value)}
                                        >
                                            {!assignmentForm.animalId && (
                                                <option value="">
                                                    {assignmentForm.petName || "Choose an animal"} (not linked)
                                                </option>
                                            )}
                                            {fosterableAnimals(assignmentForm.animalId).map((animal) => (
                                                <option key={animal._id} value={animal._id}>
                                                    {animalLabel(animal)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    {pet && (
                                        <div className="afr-pet">
                                            <span className="afr-pet-photo">
                                                {pet.image ? (
                                                    <img src={pet.image} alt={pet.name} />
                                                ) : (
                                                    <StatIcon name="paw" size={26} />
                                                )}
                                            </span>

                                            <div className="afr-pet-info">
                                                <b>{pet.name}</b>
                                                <small>{pet.breed || "Unknown breed"}</small>
                                                <div className="afr-pet-tags">
                                                    {[pet.type, pet.gender !== "Unknown" ? pet.gender : "", pet.size !== "Unknown" ? pet.size : ""]
                                                        .filter(Boolean)
                                                        .map((tag) => <span key={tag}>{tag}</span>)}
                                                </div>
                                            </div>

                                            <dl className="afr-pet-notes">
                                                <div>
                                                    <dt>Medical</dt>
                                                    <dd>{pet.medicalStatus || "No notes"}</dd>
                                                </div>
                                                <div>
                                                    <dt>Behavior</dt>
                                                    <dd>{pet.behaviorNotes || "No notes"}</dd>
                                                </div>
                                            </dl>
                                        </div>
                                    )}

                                <div className="is-wide acl-field">
                                    <span className="acl-label">
                                        Care instructions
                                        <InfoTip text="Press Enter for a new line. The foster sees each line as a checklist item." />
                                    </span>
                                    <CareChecklistInput
                                        value={assignmentForm.careInstructions}
                                        onChange={(text) =>
                                            setAssignmentForm((form) => ({ ...form, careInstructions: text }))
                                        }
                                    />
                                </div>
                                </div>

                                {message ? (
                                    <p className="afr-note is-rejected">
                                        <StatIcon name="info" size={16} />
                                        {message}
                                    </p>
                                ) : (
                                    <p className="afr-note is-approved">
                                        <StatIcon name="info" size={16} />
                                        Write each care instruction on a separate line so the foster can easily check them off one by one.
                                    </p>
                                )}
                            </div>

                            {/* Footer */}
                            <footer className="afr-foot">
                                <button type="button" className="afr-btn is-ghost" onClick={handleCancelEdit}>
                                    Cancel
                                </button>

                                <button type="submit" className="afr-btn is-assign" disabled={submitting}>
                                    <StatIcon name="check" size={16} />
                                    {submitting ? "Saving…" : "Save changes"}
                                </button>
                            </footer>
                        </form>
                    </div>
                );
            })()}
        </div>
        <aside className="afc-side">
            <section className="admin-panel admin-medical-requests-panel amr-panel">
                <div className="amr-heading">
                    <div>
                        <h2>
                            Medical Requests
                            {openMedicalRequests > 0 && (
                                <span className="amr-open">{openMedicalRequests} open</span>
                            )}
                        </h2>
                        <p>Concerns sent by foster caregivers.</p>
                    </div>

                    <button
                        type="button"
                        className="afl-refresh"
                        onClick={fetchMedicalRequests}
                    >
                        <img src="/icons/Refresh cw.svg" alt="" />
                        Refresh
                    </button>
                </div>

                {sortedMedicalRequests.length === 0 ? (
                    <p className="afc-empty">No medical requests yet.</p>
                ) : (
                    <div className="amr-list">
                        {sortedMedicalRequests.map((request) => (
                            <article
                                className={`amr-row ${request.status === "resolved" ? "is-resolved" : ""}`}
                                key={`${request.assignmentId}-${request._id}`}
                            >
                                <span className="amr-icon" aria-hidden="true">
                                    <StatIcon name="heart" size={20} />
                                </span>

                                <div className="amr-info">
                                    <b>
                                        {request.petName} · {request.issueType || request.issue}
                                    </b>
                                    <small>
                                        {request.fosterName} · {formatShortDate(request.createdAt)}
                                    </small>
                                </div>

                                <span
                                    className={`amr-badge ${
                                        request.status === "resolved"
                                            ? "is-resolved"
                                            : `is-${String(request.urgency || "low").toLowerCase()}`
                                    }`}
                                >
                                    {request.status === "resolved"
                                        ? "Resolved"
                                        : URGENCY_LABEL[request.urgency] || request.urgency || "Low"}
                                </span>

                                <button
                                    type="button"
                                    className="afa-review"
                                    onClick={() => setReviewingRequest(request)}
                                >
                                    Review
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>
            </aside>
            </div>

            {earlyReturn && (() => {
                const request = earlyReturn.returnRequest || {};
                const openMedical = (earlyReturn.medicalRequests || []).filter(
                    (item) => item.status !== "resolved"
                ).length;
                const pet = animals.find((animal) => String(animal._id) === String(earlyReturn.animalId));
                const longDate = (value) =>
                    value
                        ? formatDate(value, { withYear: false })
                        : "—";

                return (
                    <div className="admin-modal-overlay" onClick={() => setEarlyReturn(null)}>
                        <div
                            className="afr-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-label={`Return request for ${earlyReturn.petName}`}
                            onClick={(event) => event.stopPropagation()}
                        >
                            {/* Header */}
                            <header className="afr-head">
                                <span className="afr-avatar" aria-hidden="true">
                                    {getInitials(earlyReturn.fosterName || "")}
                                </span>

                                <div className="afr-who">
                                    <h2>{earlyReturn.fosterName}</h2>
                                    <small>
                                        <StatIcon name="mail" size={14} />
                                        {earlyReturn.fosterEmail}
                                    </small>
                                </div>

                                <span className={`afr-pill ${request.urgent ? "is-rejected" : "is-pending"}`}>
                                    <i aria-hidden="true" />
                                    {request.urgent ? "Urgent" : "Pending"}
                                </span>

                                <button
                                    type="button"
                                    className="afr-close"
                                    onClick={() => setEarlyReturn(null)}
                                    aria-label="Close"
                                >
                                    <StatIcon name="x" size={16} />
                                </button>
                            </header>

                            {/* Body */}
                            <div className="afr-body">
                                <div className="afr-facts">
                                    <div className="afr-fact">
                                        <span className="afr-fact-icon"><StatIcon name="paw" size={16} /></span>
                                        <div>
                                            <small>Pet</small>
                                            <b>{earlyReturn.petName}</b>
                                        </div>
                                    </div>
                                    <div className="afr-fact">
                                        <span className="afr-fact-icon"><StatIcon name="info" size={16} /></span>
                                        <div>
                                            <small>Reason</small>
                                            <b>{request.reason || "—"}</b>
                                        </div>
                                    </div>
                                    <div className="afr-fact">
                                        <span className="afr-fact-icon"><StatIcon name="calendar" size={16} /></span>
                                        <div>
                                            <small>Requested</small>
                                            <b>{longDate(request.requestedAt)}</b>
                                        </div>
                                    </div>
                                    <div className="afr-fact">
                                        <span className="afr-fact-icon"><StatIcon name="calendar" size={16} /></span>
                                        <div>
                                            <small>Preferred date</small>
                                            <b>{longDate(request.preferredDate)}</b>
                                        </div>
                                    </div>
                                </div>

                                <div className="afr-why">
                                    <h3>Foster's notes</h3>
                                    <p>{request.notes || "No notes given."}</p>
                                </div>

                                {(openMedical > 0 ||
                                    pet?.adoptionStatus === "pending" ||
                                    earlyReturn.behaviorEvaluation?.status !== "accepted") && (
                                    <ul className="afr-return-warnings">
                                        {openMedical > 0 && (
                                            <li>
                                                {openMedical} open medical {openMedical === 1 ? "request" : "requests"}. Follow up at handover.
                                            </li>
                                        )}
                                        {pet?.adoptionStatus === "pending" && (
                                            <li>{earlyReturn.petName} has a pending adoption application.</li>
                                        )}
                                        {earlyReturn.behaviorEvaluation?.status !== "accepted" && (
                                            <li>No accepted behavior evaluation. The pet's behavior scores won't be updated.</li>
                                        )}
                                    </ul>
                                )}

                                <label className="afr-reason">
                                    <span>
                                        Note to the foster <em>(needed only to decline)</em>
                                    </span>
                                    <textarea
                                        rows={3}
                                        maxLength={500}
                                        value={earlyReturnNote}
                                        onChange={(event) => {
                                            setEarlyReturnNote(event.target.value);
                                            setEarlyReturnError("");
                                        }}
                                        placeholder="e.g. Please keep her until Saturday, we'll pick her up."
                                    />
                                    {earlyReturnError && <small className="afr-reason-error">{earlyReturnError}</small>}
                                </label>

                                <p className="afr-note is-approved">
                                    <StatIcon name="info" size={16} />
                                    Only confirm once {earlyReturn.petName} is physically back at the shelter.
                                </p>
                            </div>

                            {/* Footer */}
                            <footer className="afr-foot">
                                <button
                                    type="button"
                                    className="afr-btn is-reject"
                                    onClick={() => handleEarlyReturn("decline")}
                                    disabled={earlyReturnBusy}
                                >
                                    Decline
                                </button>

                                <button
                                    type="button"
                                    className="afr-btn is-assign"
                                    onClick={() => handleEarlyReturn("confirm")}
                                    disabled={earlyReturnBusy}
                                >
                                    <StatIcon name="check" size={16} />
                                    {earlyReturnBusy ? "Saving…" : "Confirm return"}
                                </button>
                            </footer>
                        </div>
                    </div>
                );
            })()}

            {reviewingRequest && (
                <div
                    className="admin-modal-overlay"
                    onClick={() => setReviewingRequest(null)}
                >
                    <div
                        className="admin-modal afa-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Medical request for ${reviewingRequest.petName}`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="admin-modal-close"
                            onClick={() => setReviewingRequest(null)}
                            aria-label="Close"
                        >
                            <Icon name="close" />
                        </button>

                        <div className="afa-modal-head">
                            <span className="amr-icon" aria-hidden="true">
                                <StatIcon name="heart" size={22} />
                            </span>
                            <div>
                                <h2>{reviewingRequest.petName}</h2>
                                <small>
                                    {reviewingRequest.fosterName} · {reviewingRequest.fosterEmail}
                                </small>
                            </div>
                            <span
                                className={`amr-badge is-${String(
                                    reviewingRequest.urgency || "low"
                                ).toLowerCase()}`}
                            >
                                {URGENCY_LABEL[reviewingRequest.urgency] ||
                                    reviewingRequest.urgency ||
                                    "Low"}
                            </span>
                        </div>

                        <h3 className="afa-modal-title">Concern</h3>
                        <div className="afa-detail-grid">
                            <p><span>Type</span>{reviewingRequest.issueType || "—"}</p>
                            <p>
                                <span>Status</span>
                                {MEDICAL_STATUS_LABEL[reviewingRequest.status] || reviewingRequest.status}
                            </p>
                            <p>
                                <span>Sent</span>
                                {reviewingRequest.createdAt
                                    ? formatDateTime(reviewingRequest.createdAt)
                                    : "—"}
                            </p>
                            <p><span>Breed</span>{reviewingRequest.petBreed || "—"}</p>
                        </div>

                        <h3 className="afa-modal-title">Details</h3>
                        <p className="afa-notes">{reviewingRequest.issue}</p>

                        {reviewingRequest.photoUrl && (
                            <img
                                className="amr-photo"
                                src={reviewingRequest.photoUrl}
                                alt={`Photo sent for ${reviewingRequest.petName}`}
                            />
                        )}

                        <div className="afa-modal-actions">
                            {reviewingRequest.status === "pending" && (
                                <button
                                    type="button"
                                    className="afc-reject amr-progress"
                                    onClick={() => updateFromReview("in_progress")}
                                >
                                    Mark in progress
                                </button>
                            )}

                            {reviewingRequest.status !== "resolved" ? (
                                <button
                                    type="button"
                                    className="afc-approve"
                                    onClick={() => updateFromReview("resolved")}
                                >
                                    <StatIcon name="check" size={13} />
                                    Mark resolved
                                </button>
                            ) : (
                                <span className="afa-modal-note">This request is resolved.</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}