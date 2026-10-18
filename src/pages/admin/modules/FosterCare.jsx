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

// An edited application counts as unseen again until the admin opens it
function seenKey(application) {
    return application.lastEditedAt
        ? `${application._id}@${application.lastEditedAt}`
        : application._id;
}

const emptyAssignmentForm = {
    animalId: "",
    fosterApplicationId: "",
    fosterName: "",
    fosterEmail: "",
    animalId: "",
    petName: "",
    petBreed: "",
    petImage: "",
    careInstructions: "",
};


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
export default function FosterCare() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
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
    const [assigningApplication, setAssigningApplication] = useState(null);
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
    const [returnReason, setReturnReason] = useState("");
    const [returnError, setReturnError] = useState("");

    async function fetchAnimals() {
        try {
            const response = await fetch(`${API}/api/animals`);
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

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to fetch foster applications.");
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
            setMessage("Server error while fetching foster applications.");
        }
    }

    async function handleReviewFosterApplication(applicationId, status, note = "") {
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
                                : note.trim(),
                    }),
                }
            );

            const data = await response.json();

            console.log("Review foster application:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to review foster application.");
                return false;
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
                        ? "Congratulations! Your foster application has been approved. Please log out and log in again to open your Foster Dashboard."
                        : `Unfortunately, your foster application was not approved. Reason: ${note.trim()}`,

                type: "application_update",
            });

            fetchFosterApplications();
            return true;
        } catch (error) {
            console.error("Review foster application error:", error);
            setMessage("Server error while reviewing foster application.");
            return false;
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
            setMessage("");

            const response = await fetch(
                `${API}/api/foster/assignments/${id}/behavior-evaluation/return`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ reason: returnReason.trim() }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setReturnError(data.message || "Failed to send the evaluation back.");
                return;
            }

            setMessage("Behavioral evaluation sent back to the foster for revision.");

            await sendNotification({
                email: data.assignment.fosterEmail,
                title: "Behavior Evaluation Needs Changes",
                message: `Your behavioral evaluation for ${data.assignment.petName} was sent back. Reason: ${returnReason.trim()}`,
                type: "foster_update",
            });

            setReturningId(null);
            setReturnReason("");
            await fetchAssignments();
        } catch (error) {
            console.error("Return behavioral evaluation error:", error);
            setReturnError("Server error while sending the evaluation back.");
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

            animalId:
                assignment.animalId || "",

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
                message: `You have been assigned to foster ${data.assignment.petName}. Please log in to RescueBase to review your assignment.`,
                type: "foster_update",
            });

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
        fetchAnimals();
    }, []);


    // Check for new applications every 10 seconds, and right away when the admin comes back to the tab
    useEffect(() => {
        const interval = setInterval(fetchFosterApplications, 10000);

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

    const pendingApplicationCount = applications.filter(
        (application) => application.status === "pending"
    ).length;


    // Pending applications (or approved ones the foster edited) this admin hasn't opened yet
    const newApplicationIds = applications
        .filter((application) =>
            (application.status === "pending" ||
                (application.status === "approved" && application.lastEditedAt)) &&
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
            const response = await fetch(`${API}/api/animals`);
            const data = await response.json();
            const list = Array.isArray(data.animals) ? data.animals : [];

            setAnimals(
                list.filter(
                    (animal) =>
                        animal.adoptionStatus !== "adopted" &&
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

    // Dropdown pick: fill the form with the pet's saved details
    function pickAnimal(animalId) {
        const animal = animals.find((item) => item._id === animalId);

        setAssignmentForm((form) => ({
            ...form,
            animalId,
            petName: animal?.name || "",
            petBreed: animal?.breed || "",
            petImage: animal?.image || "",
        }));
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
        });
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
    <div className="afc-layout">
        <div className="afc-main">
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

                                        {returningId === assignment._id ? (
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
                                                        onClick={() => handleReturnBehaviorEvaluation(assignment._id)}
                                                    >
                                                        Send back
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="afl-eval-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAcceptBehaviorEvaluation(assignment._id)}
                                                >
                                                    Accept Evaluation
                                                </button>
                                                <button
                                                    type="button"
                                                    className="is-ghost"
                                                    onClick={() => startReturn(assignment._id)}
                                                >
                                                    Send back for revision
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                    ? "1 new foster application"
                                    : `${newApplicationCount} new foster applications`}
                            </b>
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
                                ? "No foster applications found."
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
                                                    {application.lastEditedAt ? "Updated" : "New"}
                                                </span>
                                            )}
                                        </b>
                                        <small>{application.applicantEmail}</small>
                                    </div>

                                    <div className="afa-chips">
                                        <span>Capacity {application.capacity || 1}</span>
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
                                <span className="afr-eyebrow">Foster Application</span>
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
                            {reviewingApplication.lastEditedAt &&
                                reviewingApplication.editedFields?.length > 0 && (
                                <p className="afr-note is-updated">
                                    <StatIcon name="info" size={16} />
                                    <span>
                                        Updated by the applicant on{" "}
                                        {new Date(reviewingApplication.lastEditedAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
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
                                                ? new Date(reviewingApplication.createdAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })
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

                                {reviewingApplication.status !== "approved" && (
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
                                <span className="afr-eyebrow">New Foster Assignment</span>
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
                                    const matching = animals.filter(fits);
                                    const others = animals.filter((animal) => !fits(animal));
                                    const petOption = (animal) => (
                                        <option key={animal._id} value={animal._id}>
                                            {animal.name} — {animal.type}
                                            {animal.breed ? `, ${animal.breed}` : ""}
                                        </option>
                                    );

                                    return (
                                        <label className="is-wide">
                                            <span>Pet <em>*</em></span>
                                            <select
                                                value={assignmentForm.animalId}
                                                onChange={(e) => pickAnimal(e.target.value)}
                                                disabled={animalsLoading}
                                                required
                                            >
                                                <option value="">
                                                    {animalsLoading
                                                        ? "Loading pets..."
                                                        : animals.length
                                                            ? "Select a registered pet"
                                                            : "No pets available for foster"}
                                                </option>

                                                {others.length > 0 && matching.length > 0 ? (
                                                    <>
                                                        <optgroup label={`Matches preference (${PREFERS_LABEL[prefers] || prefers})`}>
                                                            {matching.map(petOption)}
                                                        </optgroup>
                                                        <optgroup label="Other pets">
                                                            {others.map(petOption)}
                                                        </optgroup>
                                                    </>
                                                ) : (
                                                    animals.map(petOption)
                                                )}
                                            </select>
                                        </label>
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
                                <label className="is-wide">
                                    <span>Animal <em>*</em></span>
                                    <select
                                        value={assignmentForm.animalId}
                                        onChange={(e) => pickAnimal(e.target.value)}
                                        required
                                    >
                                        <option value="">Choose an animal</option>
                                        {fosterableAnimals().map((animal) => (
                                            <option key={animal._id} value={animal._id}>
                                                {animalLabel(animal)}
                                            </option>
                                        ))}
                                    </select>
                                    <small>Only animals that aren't adopted or already in foster care are listed.</small>
                                </label>

                                <label className="is-wide">
                                    Care instructions
                                    <textarea
                                        rows="3"
                                        value={assignmentForm.careInstructions}
                                        onChange={(e) =>
                                            setAssignmentForm({
                                                ...assignmentForm,
                                                careInstructions: e.target.value,
                                            })
                                        }
                                        placeholder="Provide food, water, shelter, and weekly updates."
                                    />
                                </label>
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
                                {submitting ? "Assigning..." : "Assign Foster"}
                            </button>
                        </footer>
                    </form>
                </div>
            )}

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

                            Animal

                            <select
                                value={assignmentForm.animalId}
                                onChange={(e) => pickAnimal(e.target.value)}
                            >
                                {!assignmentForm.animalId && (
                                    <option value="">{assignmentForm.petName || "Choose an animal"} (not linked)</option>
                                )}
                                {fosterableAnimals(assignmentForm.animalId).map((animal) => (
                                    <option key={animal._id} value={animal._id}>
                                        {animalLabel(animal)}
                                    </option>
                                ))}
                            </select>

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
                            ×
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
                                    ? new Date(reviewingRequest.createdAt).toLocaleString()
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
                                    Mark In Progress
                                </button>
                            )}

                            {reviewingRequest.status !== "resolved" ? (
                                <button
                                    type="button"
                                    className="afc-approve"
                                    onClick={() => updateFromReview("resolved")}
                                >
                                    <StatIcon name="check" size={13} />
                                    Mark Resolved
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