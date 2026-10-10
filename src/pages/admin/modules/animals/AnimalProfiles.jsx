import { Fragment, useEffect, useMemo, useState } from "react";
import { getCurrentUser, isAdmin, isStaff } from "../../../../utils/auth";
import BehaviorAssessment from "./BehaviorAssessment";
import VaccinationRecords from "./VaccinationRecords";
import MedicalRecords from "./MedicalRecords";
import InfoTip from "../../../../components/system/InfoTip";
import { formatAge } from "../../../../utils/formatAge";

const API = import.meta.env.VITE_BACKEND_URL;

const emptyAnimalForm = {
    name: "",
    type: "",
    breed: "",
    color: "",
    age: "",
    gender: "",
    size: "",
    image: "",
    description: "",
    medicalStatus: "",
    behaviorNotes: "",
    intakeDate: "",
    intakeType: "Rescued",
    sourceLocation: "",
    rescuedBy: "",
    intakeCondition: "",
    intakeNotes: "",
    availabilityStatus: "available",
    adoptionStatus: "available",
    fosterStatus: "none",
    location: "",
};

// Public health summary shown to adopters (diagnoses live in Medical Records)
const MEDICAL_STATUS_OPTIONS = [
    "Healthy",
    "Recovering",
    "Under Treatment",
    "Special Needs",
    "Unknown",
];

// Today's date in the computer's own timezone (YYYY-MM-DD)
function todayLocal() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

// One Status dropdown → the three status fields in the database
const STATUS_TO_FIELDS = {
    available: { availabilityStatus: "available", adoptionStatus: "available", fosterStatus: "none" },
    pending: { availabilityStatus: "available", adoptionStatus: "pending", fosterStatus: "none" },
    fostered: { availabilityStatus: "available", adoptionStatus: "available", fosterStatus: "in_foster" },
    adopted: { availabilityStatus: "unavailable", adoptionStatus: "adopted", fosterStatus: "none" },
    unavailable: { availabilityStatus: "unavailable", adoptionStatus: "available", fosterStatus: "none" },
};

const STATUS_FILTERS = [
    { key: "all", label: "All" },
    { key: "available", label: "Available" },
    { key: "pending", label: "Pending" },
    { key: "fostered", label: "Fostered" },
    { key: "adopted", label: "Adopted" },
];

// ===== Adopter Preview (live, read-only) =====
// Tags come from the backend (personalityService.js), so the rules live in one place.
function getPreviewPersonalityTags(animal) {
    return animal?.personality?.tags || [];
}

function PawIcon() {
    return (
        <svg width="46" height="46" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <g stroke="var(--orange)" strokeWidth="3.5">
                <ellipse cx="13" cy="20" rx="4" ry="5" />
                <ellipse cx="20" cy="12" rx="4" ry="5" />
                <ellipse cx="28" cy="12" rx="4" ry="5" />
                <ellipse cx="35" cy="20" rx="4" ry="5" />
                <path d="M24 23c-6 0-11 7-11 12 0 4 3 6 6 5 2-.7 3.5-1.5 5-1.5s3 .8 5 1.5c3 1 6-1 6-5 0-5-5-12-11-12z" />
            </g>
        </svg>
    );
}

function AdopterPreview({ form, savedAnimal }) {
    const status = getAnimalStatus(form);
    const personalityTags = getPreviewPersonalityTags(savedAnimal);

    const subtitleParts = [
        { value: form.type, label: "Species" },
        { value: form.breed, label: "Breed" },
        { value: form.color, label: "Color" },
    ];

    const age =
        form.age !== "" && form.age !== null && form.age !== undefined
            ? formatAge(form.age)
            : "—";

    return (
        <aside className="admin-panel admin-adopter-preview">
            <div className="admin-adopter-preview-heading">
                <h3>
                    Adopter Preview
                    <span className="admin-auto-badge">AUTO</span>
                </h3>
                <p>What Adopters see. Not editable.</p>
            </div>

            <div className="admin-preview-card">
                <div className="admin-preview-photo">
                    {form.image ? <img src={form.image} alt="" /> : <PawIcon />}
                </div>

                {status !== "available" && (
                    <p className="admin-preview-hidden">
                        Hidden from adopters ({ANIMAL_STATUS_LABELS[status]})
                    </p>
                )}

                <div className="admin-preview-body">
                    <h4 className={form.name ? "" : "is-empty"}>
                        {form.name || "New animal"}
                    </h4>

                    <p className="admin-preview-subtitle">
                        {subtitleParts.map((part, index) => (
                            <span key={part.label}>
                                {index > 0 && " · "}
                                <span className={part.value ? "" : "is-empty"}>
                                    {part.value || part.label}
                                </span>
                            </span>
                        ))}
                    </p>

                    <div className="admin-preview-grid">
                        <div>
                            <span>Age</span>
                            <strong>{age}</strong>
                        </div>
                        <div>
                            <span>Gender</span>
                            <strong>{form.gender || "—"}</strong>
                        </div>
                        <div>
                            <span>Size</span>
                            <strong>{form.size || "—"}</strong>
                        </div>
                        <div>
                            <span>Location</span>
                            <strong>{form.location || "RescueBase Shelter"}</strong>
                        </div>
                    </div>

                    <div className="admin-preview-section">
                        <h5>
                            Personality
                            <InfoTip text="Generated from the Behavioral Assessment scores. Save the assessment to update these tags." />
                        </h5>
                        {personalityTags.length > 0 ? (
                            <div className="admin-preview-tags">
                                {personalityTags.map((tag) => (
                                    <span key={tag} className="personality">{tag}</span>
                                ))}
                            </div>
                        ) : (
                            <p className="admin-preview-empty">No tags yet</p>
                        )}
                    </div>

                    <div className="admin-preview-section">
                        <h5>
                            Health
                            <InfoTip text="Comes from Medical Status. Diagnoses and treatments are never shown to adopters." />
                        </h5>
                        {form.medicalStatus ? (
                            <div className="admin-preview-tags">
                                <span className="health">{form.medicalStatus}</span>
                            </div>
                        ) : (
                            <p className="admin-preview-empty">No tags yet</p>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}

function matchesStatus(animal, statusFilter) {
    switch (statusFilter) {
        case "available":
            return (
                animal.availabilityStatus === "available" &&
                animal.adoptionStatus === "available"
            );
        case "pending":
            return getAnimalStatus(animal) === "pending";
        case "fostered":
            return animal.fosterStatus === "in_foster";
        case "adopted":
            return animal.adoptionStatus === "adopted";
        default:
            return true;
    }
}

// ===== Status pills =====
// TODO: add SVGs to public/icons/status/
// available.svg, pending.svg, fostered.svg, adopted.svg, unavailable.svg
// Until a file exists, a CSS pill is shown instead.
const STATUS_ICON_PATH = "/icons/status/";

const ANIMAL_STATUS_LABELS = {
    available: "Available",
    pending: "Pending",
    fostered: "Fostered",
    adopted: "Adopted",
    unavailable: "Unavailable",
};

function getAnimalStatus(animal) {
    if (animal.adoptionStatus === "adopted") return "adopted";
    if (animal.fosterStatus === "in_foster") return "fostered";
    if (animal.adoptionStatus === "pending") return "pending";
    if (animal.availabilityStatus === "available") return "available";
    return "unavailable";
}

function StatusPill({ status }) {
    const [iconMissing, setIconMissing] = useState(false);
    const label = ANIMAL_STATUS_LABELS[status];

    if (!iconMissing) {
        return (
            <img
                className="admin-status-svg"
                src={`${STATUS_ICON_PATH}${status}.svg`}
                alt={label}
                onError={() => setIconMissing(true)}
            />
        );
    }

    return <span className={`admin-animal-status ${status}`}>{label}</span>;
}

function formatIntakeDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
}

function QrIcon() {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
        >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
        </svg>
    );
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const ANIMAL_FORM_TABS = [
    {
        key: "overview",
        label: "Overview",
        title: "Animal Details",
        description: "Core profile fields. Fields marked * are required.",
    },
    {
        key: "behavior",
        label: "Behavioral Assessment",
        title: "Behavioral Assessment",
        description: "Rate this animal on the eight matching factors.",
    },
    {
        key: "vaccinations",
        label: "Vaccinations",
        title: "Vaccinations",
        description: "Vaccination history and upcoming schedules.",
    },
    {
        key: "medical",
        label: "Medical Records",
        title: "Medical Records",
        description: "Check-ups, treatments and medical notes.",
    },
];

export default function AnimalProfiles() {
    const canManage = isAdmin() || isStaff();
    const [animals, setAnimals] = useState([]);
    const [animalForm, setAnimalForm] = useState(emptyAnimalForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [imageUploading, setImageUploading] = useState(false);

    const [search, setSearch] = useState("");
    const [speciesFilter, setSpeciesFilter] = useState("All");
    const [viewMode, setViewMode] = useState("table");
    const [statusFilter, setStatusFilter] = useState("all");
    const [qrCodes, setQrCodes] = useState({});
    const [qrImages, setQrImages] = useState({});
    const [qrOpen, setQrOpen] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedId, setExpandedId] = useState(null);
    const [ageUnit, setAgeUnit] = useState("years");
    const [showForm, setShowForm] = useState(false);

    const [formSnapshot, setFormSnapshot] = useState(emptyAnimalForm);
    const [showDiscardModal, setShowDiscardModal] = useState(false);

    const [toast, setToast] = useState(null);

    // Auto-hide the toast after 4 seconds
    useEffect(() => {
        if (!toast) return;

        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    function showToast(text, type = "success") {
        setToast({ text, type, id: Date.now() });
    }

    const toastElement = toast && (
        <div
            key={toast.id}
            className={`admin-toast ${toast.type}`}
            role="status"
            aria-live="polite"
        >
            <span className="admin-toast-icon">
                {toast.type === "success" ? "✓" : "!"}
            </span>
            <p>{toast.text}</p>
            <button
                type="button"
                aria-label="Close"
                onClick={() => setToast(null)}
            >
                ×
            </button>
        </div>
    );

    const [activeFormTab, setActiveFormTab] = useState("overview");
    const [editingAnimal, setEditingAnimal] = useState(null);

    const viewedAnimal = animals.find((a) => a._id === expandedId) || null;

    function closeAnimalModal() {
        setExpandedId(null);
    }

    function openAnimalTab(animal, tabKey) {
        setExpandedId(null);
        handleEditAnimal(animal);
        setActiveFormTab(tabKey);
    }

    // Close on Esc + stop the page behind from scrolling
    useEffect(() => {
        if (!expandedId) return;

        const onKey = (e) => {
            if (e.key === "Escape") setExpandedId(null);
        };
        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);

        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [expandedId]);

    const currentFormTab =
        ANIMAL_FORM_TABS.find((tab) => tab.key === activeFormTab) ||
        ANIMAL_FORM_TABS[0];

    
    const isFormDirty =
        JSON.stringify(animalForm) !== JSON.stringify(formSnapshot);

    const token = localStorage.getItem("token");

    const totalAnimals = animals.length;

    const availableAnimals = useMemo(() => {
        return animals.filter(
            (animal) =>
                animal.availabilityStatus === "available" &&
                animal.adoptionStatus === "available"
        ).length;
    }, [animals]);

    const pendingAnimals = useMemo(() => {
        return animals.filter((animal) => animal.adoptionStatus === "pending").length;
    }, [animals]);

    const adoptedAnimals = useMemo(() => {
        return animals.filter((animal) => animal.adoptionStatus === "adopted").length;
    }, [animals]);

    const filteredAnimals = useMemo(() => {
        const query = search.trim().toLowerCase();

        return animals.filter((animal) => {
            if (!matchesStatus(animal, statusFilter)) {
                return false;
            }

            if (speciesFilter !== "All" && animal.type !== speciesFilter) {
                return false;
            }

            if (!query) return true;

            return [animal.name, animal.type]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [animals, search, speciesFilter, statusFilter]);


    const sortedAnimals = useMemo(() => {
        const list = [...filteredAnimals];
        const direction = sortConfig.direction === "asc" ? 1 : -1;

        list.sort((a, b) => {
            if (sortConfig.key === "intakeDate") {
                return (
                    (new Date(a.intakeDate || 0) - new Date(b.intakeDate || 0)) *
                    direction
                );
            }

            return (
                String(a.name || "").localeCompare(String(b.name || "")) *
                direction
            );
        });

        return list;
    }, [filteredAnimals, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(sortedAnimals.length / rowsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * rowsPerPage;
    const pagedAnimals = sortedAnimals.slice(pageStart, pageStart + rowsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, speciesFilter, statusFilter, rowsPerPage]);

    function handleSort(key) {
        setSortConfig((current) =>
            current.key === key
                ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        );
    }

    function sortArrow(key) {
        if (sortConfig.key !== key) return "▾";
        return sortConfig.direction === "asc" ? "▲" : "▼";
    }

    async function fetchAnimals() {
        try {
            setLoading(true);
            setMessage("");

            const response = await fetch(`${API}/api/animals`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await response.json();

            console.log("Animals:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to fetch animals.");
                return;
            }

            setAnimals(data.animals || []);
        } catch (error) {
            console.error("Fetch animals error:", error);
            setMessage("Server error while fetching animals.");
        } finally {
            setLoading(false);
        }
    }

        async function fetchQrCodes() {
        try {
            const response = await fetch(`${API}/api/qr-tags`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) return;

            const data = await response.json();
            const records = Array.isArray(data)
                ? data
                : data.qrTags || data.records || [];

            const codeMap = {};
            const imageMap = {};    
            records.forEach((record) => {
                const animalId = record.animal?._id || record.animal;
                if (animalId) { codeMap[animalId] = record.tagCode; imageMap[animalId] = record.qrImageUrl; }
            });

            setQrCodes(codeMap);
            setQrImages(imageMap);  
        } catch {
            // QR search is optional; name/breed search still works
        }
    }

    async function handleSubmitAnimal(e) {
        e.preventDefault();

        if (!isFormDirty) return;

        try {
            setSubmitting(true);
            setMessage("");

            const savedUser = getCurrentUser();

            const payload = {
                ...animalForm,
                age: Number(animalForm.age || 0),
                adminName: savedUser.name || savedUser.username || "Admin User",
                adminEmail: savedUser.email || "admin",
            };

            delete payload.behaviorNotes; // edited in the Behavioral Assessment tab

            const endpoint = editingId
                ? `${API}/api/animals/${editingId}`
                : `${API}/api/animals`;

            const method = editingId ? "PATCH" : "POST";

            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            console.log("Save animal:", data);

            if (!response.ok || !data.success) {
                const errorText = data.message || "Failed to save animal profile.";
                setMessage(errorText);
                showToast(errorText, "error");
                return;
            }

            setMessage("");

            if (!editingId) {
                const newAnimal = data.animal;

                if (!newAnimal?._id) {
                    // Fallback: server didn't return the new animal
                    closeForm();
                    showToast(`${animalForm.name} was added successfully.`);
                    fetchAnimals();
                    return;
                }

                setEditingId(newAnimal._id);
                setEditingAnimal(newAnimal);
                showToast(
                    `${newAnimal.name} was added! You can now fill in the other tabs.`
                );
            } else {
                setEditingAnimal((current) => data.animal || { ...current, ...payload });
                showToast(`${animalForm.name}'s profile was updated.`);
            }

            setFormSnapshot({ ...animalForm });
            fetchAnimals();
        } catch (error) {
            console.error("Save animal error:", error);
            setMessage("Server error while saving animal profile.");
            showToast("Server error while saving. Please try again.", "error");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleUploadAnimalImage(e) {
        const file = e.target.files?.[0];

        if (!file) return;

        setMessage("");
        setImageUploading(true);

        try {
            const formData = new FormData();
            formData.append("image", file);

            const response = await fetch(`${API}/api/uploads/image`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData,
            });

            const data = await response.json();

            console.log("Upload image:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to upload image.");
                return;
            }

            setAnimalForm((prev) => ({
                ...prev,
                image: data.imageUrl,
            }));

            setMessage("Image uploaded successfully.");
        } catch (error) {
            console.error("Upload animal image error.");
            setMessage("Server error while uploading image.");
        } finally {
            setImageUploading(false);
            e.target.value = "";
        }
    }

    function handleEditAnimal(animal) {
        const editForm = {
            name: animal.name || "",
            type: animal.type || "Dog",
            breed: animal.breed || "",
            age: animal.age || "",
            gender: animal.gender || "Unknown",
            size: animal.size || "Unknown",
            color: animal.color || "",
            image: animal.image || "",
            description: animal.description || "",
            medicalStatus: animal.medicalStatus || "",
            behaviorNotes: animal.behaviorNotes || "",
            intakeDate: animal.intakeDate ? String(animal.intakeDate).slice(0, 10) : "",
            intakeType: animal.intakeType || "Rescued",
            sourceLocation: animal.sourceLocation || "",
            rescuedBy: animal.rescuedBy || "",
            intakeNotes: animal.intakeNotes || "",
            intakeCondition: animal.intakeCondition || "Unknown",
            availabilityStatus: animal.availabilityStatus || "available",
            adoptionStatus: animal.adoptionStatus || "available",
            fosterStatus: animal.fosterStatus || "none",
            location: animal.location || "RescueBase Shelter",
        };

        setEditingId(animal._id);
        setAnimalForm(editForm);
        setAgeUnit(animal.age > 0 && animal.age < 1 ? "months" : "years");
        setFormSnapshot(editForm);
        setMessage("Editing animal profile.");
        setEditingAnimal(animal);
        setActiveFormTab("overview");
        setShowForm(true);
        window.scrollTo({ top: 0 });
    }

    function handleCancelEdit() {
        setEditingId(null);
        setEditingAnimal(null);
        setAnimalForm(emptyAnimalForm);
        setMessage("");
    }

    function handleAddAnimal() {
        handleCancelEdit();

        const freshForm = { ...emptyAnimalForm, intakeDate: todayLocal() };
        setAnimalForm(freshForm);
        setFormSnapshot(freshForm);
        setAgeUnit("years");

        setActiveFormTab("overview");
        setShowForm(true);
        window.scrollTo({ top: 0 });
    }

    function closeForm() {
        handleCancelEdit();
        setShowDiscardModal(false);
        setShowForm(false);
        window.scrollTo({ top: 0 });
    }

    function handleBackToList() {
        if (isFormDirty) {
            setShowDiscardModal(true);
            return;
        }

        closeForm();
    }

    async function handleDeleteAnimal(id) {

        if (!isAdmin()) {
            setMessage("Only administrators can delete animal profiles");
            return;
        }

        const confirmed = window.confirm("Delete this animal profile?");

        if (!confirmed) return;

        try {
            setMessage("");

            const response = await fetch(`${API}/api/animals/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            console.log("Delete animal:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to delete animal profile.");
                return;
            }

            setMessage("Animal profile deleted successfully.");

            if (editingId === id) {
                handleCancelEdit();
            }

            fetchAnimals();
        } catch (error) {
            console.error("Delete animal error:", error);
            setMessage("Server error while deleting animal profile.");
        }
    }

    useEffect(() => {
        fetchAnimals();
        fetchQrCodes();
    }, []);

    useEffect(() => {
        if (!showForm || !isFormDirty) return;

        function handleBeforeUnload(e) {
            e.preventDefault();
            e.returnValue = "";
        }

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [showForm, isFormDirty]);

        if (showForm && canManage) {
        return (
            <section className="admin-animal-page">
                {toastElement}
                <div className="admin-page-header">
                    <div>
                        <h2>{editingId ? "Edit Animal" : "Add Animal"}</h2>
                        <p>
                            {editingId
                                ? "Update this animal's details and status."
                                : "Register a new animal under shelter care."}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="admin-page-header-back"
                        onClick={handleBackToList}
                    >
                        ← Back to list
                    </button>
                </div>

    <div className="admin-animal-form-layout">

                    <section className="admin-panel admin-animal-form-panel" id="animal-form">
                    <nav className="admin-tabs" role="tablist" aria-label="Animal profile sections">
                        {ANIMAL_FORM_TABS.map((tab) => {
                            const locked = tab.key !== "overview" && !editingId;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeFormTab === tab.key}
                                    className={activeFormTab === tab.key ? "active" : ""}
                                    disabled={locked}
                                    title={locked ? "Save the animal first to unlock this tab" : undefined}
                                    onClick={() => setActiveFormTab(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="admin-panel-heading admin-tab-heading">
                        <div>
                            <h2>{currentFormTab.title}</h2>
                            <p>{currentFormTab.description}</p>
                        </div>
                    </div>

            <div hidden={activeFormTab !== "overview"}>

                    <form className="admin-animal-form" onSubmit={handleSubmitAnimal}>
                        {/* ===== Row 1 ===== */}
                        <label>
                            <span className="admin-field-label">
                                Animal Name <span className="admin-required">*</span>
                            </span>
                            <input
                                value={animalForm.name}
                                onChange={(e) => setAnimalForm({ ...animalForm, name: e.target.value })}
                                placeholder="e.g. Max"
                                required
                            />
                        </label>

                        <label>
                            <span className="admin-field-label">
                                Species <span className="admin-required">*</span>
                            </span>
                            <select
                                value={animalForm.type}
                                onChange={(e) => setAnimalForm({ ...animalForm, type: e.target.value })}
                                required
                            >
                                <option value="" disabled>Select</option>
                                <option value="Dog">Dog</option>
                                <option value="Cat">Cat</option>
                            </select>
                        </label>

                        <label>
                            <span className="admin-field-label">Breed</span>
                            <input
                                value={animalForm.breed}
                                onChange={(e) => setAnimalForm({ ...animalForm, breed: e.target.value })}
                                placeholder="e.g. Shih Tzu"
                            />
                        </label>

                        <label>
                            <span className="admin-field-label">Color</span>
                            <input
                                value={animalForm.color}
                                onChange={(e) => setAnimalForm({ ...animalForm, color: e.target.value })}
                                placeholder="e.g. Brown and white"
                            />
                        </label>

                        {/* ===== Row 2 ===== */}
                        <label>
                            <span className="admin-field-label">Age</span>
                            <div className="admin-age-input">
                                <input
                                    type="number"
                                    min="0"
                                    step={ageUnit === "months" ? "1" : "0.5"}
                                    value={
                                        ageUnit === "months" && animalForm.age !== ""
                                            ? Math.round(Number(animalForm.age) * 12)
                                            : animalForm.age
                                    }
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        const age = raw === "" ? "" : ageUnit === "months" ? Number(raw) / 12 : raw;
                                        setAnimalForm({ ...animalForm, age });
                                    }}
                                    placeholder={ageUnit === "months" ? "e.g. 4" : "e.g. 2"}
                                />
                                <select value={ageUnit} onChange={(e) => setAgeUnit(e.target.value)}>
                                    <option value="years">Years</option>
                                    <option value="months">Months</option>
                                </select>
                            </div>
                        </label>

                        <label>
                            <span className="admin-field-label">
                                Gender <span className="admin-required">*</span>
                            </span>
                            <select
                                value={animalForm.gender}
                                onChange={(e) => setAnimalForm({ ...animalForm, gender: e.target.value })}
                                required
                            >
                                <option value="" disabled>Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Unknown">Unknown</option>
                            </select>
                        </label>

                        <label>
                            <span className="admin-field-label">
                                Size <span className="admin-required">*</span>
                            </span>
                            <select
                                value={animalForm.size}
                                onChange={(e) => setAnimalForm({ ...animalForm, size: e.target.value })}
                                required
                            >
                                <option value="" disabled>Select</option>
                                <option value="Small">Small</option>
                                <option value="Medium">Medium</option>
                                <option value="Large">Large</option>
                                <option value="Unknown">Unknown</option>
                            </select>
                        </label>

                        <label>
                            <span className="admin-field-label">
                                Status <span className="admin-required">*</span>
                                <InfoTip text="Current shelter status: Available, Pending Adoption, Fostered, Adopted or Unavailable. Changing it updates what adopters see." />
                            </span>
                            <select
                                value={getAnimalStatus(animalForm)}
                                onChange={(e) =>
                                    setAnimalForm({ ...animalForm, ...STATUS_TO_FIELDS[e.target.value] })
                                }
                                required
                            >
                                <option value="available">Available</option>
                                <option value="pending">Pending Adoption</option>
                                <option value="fostered">Fostered</option>
                                <option value="adopted">Adopted</option>
                                <option value="unavailable">Unavailable</option>
                            </select>
                        </label>

                        {/* ===== Row 3 ===== */}
                        <label>
                            <span className="admin-field-label">
                                Intake Date <span className="admin-required">*</span>
                            </span>
                            <input
                                type="date"
                                value={animalForm.intakeDate}
                                max={todayLocal()}
                                onChange={(e) => setAnimalForm({ ...animalForm, intakeDate: e.target.value })}
                                required
                            />
                        </label>

                        <label>
                            <span className="admin-field-label">
                                Shelter Location
                                <InfoTip text="Where the animal is staying now. Adopters see this on the pet profile. Leave blank for Mayari Animal Rescue." />
                            </span>
                            <input
                                value={animalForm.location}
                                onChange={(e) => setAnimalForm({ ...animalForm, location: e.target.value })}
                                placeholder="e.g. Mayari Animal Rescue"
                            />
                        </label>

                        <label>
                            <span className="admin-field-label">
                                Medical Status
                                <InfoTip text="The animal's overall health status, shown to adopters on the detail page. Diagnosis and treatment stay private in Medical Records." />
                            </span>
                            <select
                                value={animalForm.medicalStatus}
                                onChange={(e) => setAnimalForm({ ...animalForm, medicalStatus: e.target.value })}
                            >
                                <option value="">Select</option>
                                {MEDICAL_STATUS_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                                {/* Keep older free-text values selectable */}
                                {animalForm.medicalStatus &&
                                    !MEDICAL_STATUS_OPTIONS.includes(animalForm.medicalStatus) && (
                                        <option value={animalForm.medicalStatus}>
                                            {animalForm.medicalStatus}
                                        </option>
                                    )}
                            </select>
                        </label>

                        <label>
                            <span className="admin-field-label">
                                QR Code
                                <InfoTip text="QR tags are created on the QR Tags page after the animal is saved." />
                            </span>
                            <input
                                value={
                                    editingId
                                        ? qrCodes[editingId] || "Not generated yet"
                                        : "Available after saving"
                                }
                                readOnly
                            />
                        </label>

                        {/* ===== Row 4 ===== */}
                        <label className="admin-photo-field">
                            <span className="admin-field-label">Photo</span>
                            <span className="admin-photo-input">
                                {animalForm.image && <img src={animalForm.image} alt="" />}
                                <span>
                                    {imageUploading
                                        ? "Uploading..."
                                        : animalForm.image
                                            ? "Change photo"
                                            : "Upload JPG or PNG"}
                                </span>
                            </span>
                            <input
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={handleUploadAnimalImage}
                                disabled={imageUploading}
                            />
                        </label>

                        <label className="admin-animal-span-3">
                            <span className="admin-field-label">Description</span>
                            <textarea
                                rows={1}
                                value={animalForm.description}
                                onChange={(e) => setAnimalForm({ ...animalForm, description: e.target.value })}
                                placeholder="Appearance, condition, notes..."
                            />
                        </label>

                        {/* ===== Intake record ===== */}
                        <div className="admin-form-section admin-animal-full">
                            <h3>Intake Record</h3>
                            <p>How the animal came into the shelter.</p>
                        </div>

                        <div className="admin-intake-grid admin-animal-full">
                            <label>
                                <span className="admin-field-label">
                                    Intake Type <span className="admin-required">*</span>
                                </span>
                                <select
                                    value={animalForm.intakeType}
                                    onChange={(e) => setAnimalForm({ ...animalForm, intakeType: e.target.value })}
                                    required
                                >
                                    <option value="Rescued">Rescue</option>
                                    <option value="Stray">Stray</option>
                                    <option value="Owner Surrender">Owner Surrender</option>
                                    <option value="Transferred">Transfer</option>
                                </select>
                            </label>

                            <label>
                                <span className="admin-field-label">
                                    Source Location <span className="admin-required">*</span>
                                    <InfoTip text="Where the animal was found or came from. This is not shown to adopters." />
                                </span>
                                <input
                                    value={animalForm.sourceLocation}
                                    onChange={(e) => setAnimalForm({ ...animalForm, sourceLocation: e.target.value })}
                                    placeholder="e.g. Cebu City"
                                    required
                                />
                            </label>

                            <label>
                                <span className="admin-field-label">Rescued By</span>
                                <input
                                    value={animalForm.rescuedBy}
                                    onChange={(e) => setAnimalForm({ ...animalForm, rescuedBy: e.target.value })}
                                    placeholder="e.g. Juan Dela Cruz"
                                />
                            </label>

                            <label>
                                <span className="admin-field-label">
                                    Condition <span className="admin-required">*</span>
                                    <InfoTip text="The animal's condition on arrival. Medical Status above is its current condition." />
                                </span>
                                <select
                                    value={animalForm.intakeCondition}
                                    onChange={(e) => setAnimalForm({ ...animalForm, intakeCondition: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select</option>
                                    <option value="Healthy">Healthy</option>
                                    <option value="Injured">Injured</option>
                                    <option value="Sick">Sick</option>
                                    <option value="Under Observation">Under Observation</option>
                                    <option value="Unknown">Unknown</option>
                                </select>
                            </label>

                            <label className="admin-intake-notes">
                                <span className="admin-field-label">Notes</span>
                                <input
                                    value={animalForm.intakeNotes}
                                    onChange={(e) => setAnimalForm({ ...animalForm, intakeNotes: e.target.value })}
                                    placeholder="Optional"
                                />
                            </label>
                        </div>

                        {message && <p className="admin-animal-message">{message}</p>}

                        {/* ===== Footer ===== */}
                        <div className="admin-form-footer admin-animal-full">
                            <p>
                                {editingId
                                    ? "Behavioral Assessment, Vaccinations and Medical Records are in the tabs above."
                                    : "Next: Behavioral Assessment is optional and can be added after saving."}
                            </p>

                            <div className="admin-form-footer-actions">
                                <button
                                    type="button"
                                    className="admin-form-cancel"
                                    onClick={handleBackToList}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="admin-form-save"
                                    disabled={submitting || imageUploading || !isFormDirty}
                                    title={!isFormDirty ? "No changes to save" : undefined}
                                >
                                    {submitting
                                        ? "Saving..."
                                        : editingId
                                            ? "Update Animal"
                                            : "Save Animal"}
                                </button>
                            </div>
                        </div>
                    </form>
            </div>

            {editingAnimal && (
                <>
                    <div className="admin-tab-content" hidden={activeFormTab !== "behavior"}>
                        <BehaviorAssessment
                            key={editingAnimal._id}
                            lockedAnimal={editingAnimal}
                            onSaved={(updatedAnimal) => {
                                setEditingAnimal(updatedAnimal);
                                fetchAnimals();
                            }}
                        />
                    </div>

                    <div className="admin-tab-content" hidden={activeFormTab !== "vaccinations"}>
                        <VaccinationRecords key={editingAnimal._id} lockedAnimal={editingAnimal} />
                    </div>

                    <div className="admin-tab-content" hidden={activeFormTab !== "medical"}>
                        <MedicalRecords key={editingAnimal._id} lockedAnimal={editingAnimal} />
                    </div>
                </>
            )}
                </section>

                        <AdopterPreview form={animalForm} savedAnimal={editingAnimal} />
    </div>

            {showDiscardModal && (
                <div
                    className="admin-modal-backdrop"
                    onClick={() => setShowDiscardModal(false)}
                >
                    <div
                        className="admin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="discard-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="discard-title">Discard changes?</h3>
                        <p>
                            {editingId
                                ? "Your edits to this animal haven't been saved. If you leave now, they'll be lost."
                                : "This new animal hasn't been saved. If you leave now, everything you entered will be lost."}
                        </p>

                        <div className="admin-modal-actions">
                            <button
                                type="button"
                                className="admin-modal-cancel"
                                onClick={() => setShowDiscardModal(false)}
                            >
                                Keep Editing
                            </button>

                            <button
                                type="button"
                                className="admin-modal-danger"
                                onClick={closeForm}
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </section>
        );
    }

    return (
        <section className="admin-animal-page">
            {toastElement}
            <div className="admin-page-header">
                <div>
                    <h2>Animal Profiles</h2>
                    <p>Manage every animal under shelter care.</p>
                </div>

                 {canManage && (//new up for add button
                    <button
                        type="button"
                        className="admin-page-header-btn"
                        onClick={handleAddAnimal}
                    >
                        + Add Animal
                    </button>
                 )}
            </div>
            
            <div className="admin-animal-stats">
                <article className="admin-stat-card">
                    <span>Total Animals</span>
                    <strong>{totalAnimals}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Available</span>
                    <strong>{availableAnimals}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Pending Adoption</span>
                    <strong>{pendingAnimals}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Adopted</span>
                    <strong>{adoptedAnimals}</strong>
                </article>
            </div>


            <section className="admin-panel admin-animal-list-panel">
                    <div className="admin-animal-toolbar">
                    <input
                        type="text"
                        className="admin-animal-search"
                        placeholder="Search by name or species..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <select
                        className="admin-animal-species"
                        value={speciesFilter}
                        onChange={(e) => setSpeciesFilter(e.target.value)}
                    >
                        <option value="All">All</option>
                        <option value="Dog">Dog</option>
                        <option value="Cat">Cat</option>
                    </select>

                    <div className="admin-view-toggle">
                        <button
                            type="button"
                            className={viewMode === "cards" ? "active" : ""}
                            onClick={() => setViewMode("cards")}
                        >
                            Cards
                        </button>
                        <button
                            type="button"
                            className={viewMode === "table" ? "active" : ""}
                            onClick={() => setViewMode("table")}
                        >
                            Table
                        </button>
                    </div>
                </div>

                <div className="admin-status-filters">
                    {STATUS_FILTERS.map((filter) => (
                        <button
                            key={filter.key}
                            type="button"
                            className={statusFilter === filter.key ? "active" : ""}
                            onClick={() => setStatusFilter(filter.key)}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <p className="admin-empty">Loading animal profiles...</p>
                ) : animals.length === 0 ? (
                    <p className="admin-empty">No animal profiles found.</p>
                ) : filteredAnimals.length === 0 ? (
                    <p className="admin-empty">No animals match your search.</p>
                ) : viewMode === "cards" ? (
                    <div className="admin-animal-list">
                        {filteredAnimals.map((animal) => (
                            <article className="admin-animal-card" key={animal._id}>
                                <div className="admin-animal-image">
                                    {animal.image ? (
                                        <img src={animal.image} alt={animal.name} />
                                    ) : (
                                        <span>🐾</span>
                                    )}
                                </div>

                                <div className="admin-animal-info">
                                    <h3>{animal.name}</h3>
                                    <p>
                                        {animal.type} • {animal.breed || "Unknown breed"} •{" "}
                                        {animal.gender}
                                    </p>
                                    <small>{animal.location || "RescueBase Shelter"}</small>

                                    <div className="admin-animal-badges">
                                        <StatusPill status={getAnimalStatus(animal)} />
                                    </div>
                                </div>

                                <div className="admin-animal-details">
                                    <p><b>Age:</b> {formatAge(animal.age)}</p>
                                    <p><b>Size:</b> {animal.size}</p>
                                    <p><b>Condition:</b> {animal.intakeCondition}</p>
                                </div>

                                <div className="admin-animal-actions">
                                    {canManage && (//new up for edit button
                                        <button type="button" onClick={() => handleEditAnimal(animal)}>
                                            Edit
                                        </button>
                                    )}

                                    {isAdmin() && (
                                        <button
                                            type="button"
                                            className="delete"
                                            onClick={() => handleDeleteAnimal(animal._id)}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="admin-animal-table-wrap">
                        <div className="admin-animal-table-scroll">
                            <table className="admin-animal-table">
                                <thead>
                                    <tr>
                                        <th>
                                            <button
                                                type="button"
                                                className={`admin-sort-btn ${sortConfig.key === "name" ? "active" : ""}`}
                                                onClick={() => handleSort("name")}
                                            >
                                                Animal {sortArrow("name")}
                                            </button>
                                        </th>
                                        <th>Species</th>
                                        <th>Breed</th>
                                        <th>Age</th>
                                        <th>Gender</th>
                                        <th>Status</th>
                                        <th>
                                            <button
                                                type="button"
                                                className={`admin-sort-btn ${sortConfig.key === "intakeDate" ? "active" : ""}`}
                                                onClick={() => handleSort("intakeDate")}
                                            >
                                                Intake Date {sortArrow("intakeDate")}
                                            </button>
                                        </th>
                                        <th>QR Code</th>
                                        <th aria-label="Actions"></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {pagedAnimals.map((animal) => {
                                        const status = getAnimalStatus(animal);
                                        const isExpanded = expandedId === animal._id;

                                        return (
                                            <Fragment key={animal._id}>
                                                <tr className={isExpanded ? "expanded" : ""}>
                                                    <td>
                                                        <div className="admin-animal-name-cell">
                                                            <span className="admin-animal-avatar">
                                                                {animal.image ? (
                                                                    <img src={animal.image} alt="" />
                                                                ) : (
                                                                    "🐾"
                                                                )}
                                                            </span>
                                                            <strong>{animal.name}</strong>
                                                        </div>
                                                    </td>
                                                    <td>{animal.type}</td>
                                                    <td>{animal.breed || "—"}</td>
                                                    <td>{formatAge(animal.age)}</td>
                                                    <td>{animal.gender}</td>
                                                    <td>
                                                        <StatusPill key={status} status={status} />
                                                    </td>
                                                    <td>{formatIntakeDate(animal.intakeDate)}</td>
                                                    <td>
                                                        {qrCodes[animal._id] ? (
                                                            <span
                                                                className="admin-qr-chip"
                                                                title="Click to view QR"
                                                                style={{ cursor: "zoom-in" }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (qrImages[animal._id]) setQrOpen({ image: qrImages[animal._id], code: qrCodes[animal._id], name: animal.name });
                                                                }}
                                                            >
                                                                <QrIcon />
                                                                {qrCodes[animal._id]}
                                                            </span>
                                                        ) : (
                                                            <span className="admin-qr-none">No tag</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="admin-animal-row-actions">
                                                            <button
                                                                type="button"
                                                                className="view"
                                                                onClick={() => setExpandedId(animal._id)}
                                                            >
                                                                View
                                                            </button>

                                                            {canManage && (//updated for edit button
                                                                <button
                                                                    type="button"
                                                                    className="edit"
                                                                    onClick={() => handleEditAnimal(animal)}
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}

                                                            {isAdmin() && (
                                                                <button
                                                                    type="button"
                                                                    className="delete"
                                                                    onClick={() => handleDeleteAnimal(animal._id)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="admin-table-footer">
                            <label>
                                Rows per page:
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                >
                                    {ROWS_PER_PAGE_OPTIONS.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <span>
                                {pageStart + 1}–{Math.min(pageStart + rowsPerPage, sortedAnimals.length)} of{" "}
                                {sortedAnimals.length}
                            </span>

                            <div className="admin-pagination">
                                <button
                                    type="button"
                                    disabled={safePage === 1}
                                    onClick={() => setCurrentPage(safePage - 1)}
                                    aria-label="Previous page"
                                >
                                    ‹
                                </button>

                                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                    <button
                                        key={page}
                                        type="button"
                                        className={page === safePage ? "active" : ""}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    disabled={safePage === totalPages}
                                    onClick={() => setCurrentPage(safePage + 1)}
                                    aria-label="Next page"
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {viewedAnimal && (
                <div className="admin-modal-backdrop" onClick={closeAnimalModal}>
                    <div
                        className="admin-animal-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="animal-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="admin-animal-modal-head">
                            <div className="admin-animal-modal-photo">
                                {viewedAnimal.image ? (
                                    <img src={viewedAnimal.image} alt="" />
                                ) : (
                                    <PawIcon />
                                )}
                            </div>

                            <div className="admin-animal-modal-title">
                                <h2 id="animal-modal-title">{viewedAnimal.name}</h2>
                                <p>
                                    {viewedAnimal.type}
                                    {viewedAnimal.breed ? ` · ${viewedAnimal.breed}` : ""}
                                </p>
                            </div>

                            <StatusPill status={getAnimalStatus(viewedAnimal)} />

                            <button
                                type="button"
                                className="admin-animal-modal-close"
                                onClick={closeAnimalModal}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </header>

                        <div className="admin-animal-modal-body">
                            <div className="admin-animal-modal-grid">
                                <div><span>Age</span><p>{formatAge(viewedAnimal.age)}</p></div>
                                <div><span>Gender</span><p>{viewedAnimal.gender || "—"}</p></div>
                                <div><span>Size</span><p>{viewedAnimal.size || "—"}</p></div>
                                <div><span>Color</span><p>{viewedAnimal.color || "—"}</p></div>
                                <div><span>Condition</span><p>{viewedAnimal.intakeCondition || "—"}</p></div>
                                <div><span>Location</span><p>{viewedAnimal.location || "RescueBase Shelter"}</p></div>
                                <div><span>Intake Date</span><p>{formatIntakeDate(viewedAnimal.intakeDate)}</p></div>
                                <div>
                                    <span>QR Code</span>
                                    {qrCodes[viewedAnimal._id] ? (
                                        <div>
                                            {qrImages[viewedAnimal._id] && (
                                                <img
                                                    src={qrImages[viewedAnimal._id]}
                                                    alt="QR"
                                                    title="Click to enlarge"
                                                    onClick={() => setQrOpen({ image: qrImages[viewedAnimal._id], code: qrCodes[viewedAnimal._id], name: viewedAnimal.name })}
                                                    style={{ width: 72, height: 72, cursor: "zoom-in", transition: "transform .15s" }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                                                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                                />
                                            )}
                                            <p>{qrCodes[viewedAnimal._id]}</p>
                                        </div>
                                    ) : (
                                        <p className="muted">No tag yet</p>
                                    )}
                                </div>
                                <div className="half">
                                    <span>Medical Status</span>
                                    <p className="plain">{viewedAnimal.medicalStatus || "—"}</p>
                                </div>
                                <div className="half">
                                    <span>Behavior Notes</span>
                                    <p className="plain">{viewedAnimal.behaviorNotes || "—"}</p>
                                </div>
                                <div className="full">
                                    <span>Description</span>
                                    <p className="plain">{viewedAnimal.description || "—"}</p>
                                </div>
                            </div>

                            <aside className="admin-animal-modal-side">
                                <div className="admin-animal-modal-box">
                                    <h4>Adopters see</h4>
                                    {getPreviewPersonalityTags(viewedAnimal).length > 0 ? (
                                        <div className="admin-animal-modal-tags">
                                            {getPreviewPersonalityTags(viewedAnimal).map((tag) => (
                                                <span key={tag}>{tag}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="muted">No personality tags yet.</p>
                                    )}
                                </div>

                                {canManage && (
                                    <div className="admin-animal-modal-box">
                                        <h4>Manage records</h4>
                                        <button type="button" onClick={() => openAnimalTab(viewedAnimal, "behavior")}>
                                            Behavioral Assessment <span aria-hidden="true">›</span>
                                        </button>
                                        <button type="button" onClick={() => openAnimalTab(viewedAnimal, "vaccinations")}>
                                            Vaccinations <span aria-hidden="true">›</span>
                                        </button>
                                        <button type="button" onClick={() => openAnimalTab(viewedAnimal, "medical")}>
                                            Medical Records <span aria-hidden="true">›</span>
                                        </button>
                                    </div>
                                )}
                            </aside>
                        </div>

                        <footer className="admin-animal-modal-foot">
                            <button type="button" className="admin-animal-modal-back" onClick={closeAnimalModal}>
                                ← Back to list
                            </button>

                            <div>
                                {isAdmin() && (
                                    <button
                                        type="button"
                                        className="admin-animal-modal-delete"
                                        onClick={() => handleDeleteAnimal(viewedAnimal._id)}
                                    >
                                        Delete
                                    </button>
                                )}
                                {canManage && (
                                    <button
                                        type="button"
                                        className="admin-animal-modal-edit"
                                        onClick={() => {
                                            closeAnimalModal();
                                            handleEditAnimal(viewedAnimal);
                                        }}
                                    >
                                        Edit Animal
                                    </button>
                                )}
                            </div>
                        </footer>
                    </div>
                </div>
            )}
            {qrOpen && (
                <div
                    onClick={() => setQrOpen(null)}
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}
                >
                    <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", padding: 24, borderRadius: 12, textAlign: "center" }}>
                        <img src={qrOpen.image} alt="QR code" style={{ width: 320, height: 320 }} />
                        <p style={{ marginTop: 12, fontWeight: 600 }}>{qrOpen.name} · {qrOpen.code}</p>
                        <button type="button" onClick={() => setQrOpen(null)} style={{ marginTop: 8, fontSize: 24 }}>❌</button>
                    </div>
                </div>
            )}
        </section>
    );
}