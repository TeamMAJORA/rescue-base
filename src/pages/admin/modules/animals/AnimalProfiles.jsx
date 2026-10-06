import { Fragment, useEffect, useMemo, useState } from "react";
import { getCurrentUser, isAdmin, isStaff } from "../../../../utils/auth";
import BehaviorAssessment from "./BehaviorAssessment";
import VaccinationRecords from "./VaccinationRecords";
import MedicalRecords from "./MedicalRecords";

const API = import.meta.env.VITE_BACKEND_URL;

const emptyAnimalForm = {
    name: "",
    type: "Dog",
    breed: "",
    age: "",
    gender: "Unknown",
    size: "Unknown",
    color: "",
    image: "",
    description: "",
    medicalStatus: "",
    behaviorNotes: "",
    intakeCondition: "Unknown",
    availabilityStatus: "available",
    adoptionStatus: "available",
    fosterStatus: "none",
    location: "RescueBase Shelter",
};

const STATUS_FILTERS = [
    { key: "all", label: "All" },
    { key: "available", label: "Available" },
    { key: "fostered", label: "Fostered" },
    { key: "adopted", label: "Adopted" },
];

function matchesStatus(animal, statusFilter) {
    switch (statusFilter) {
        case "available":
            return (
                animal.availabilityStatus === "available" &&
                animal.adoptionStatus === "available"
            );
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
    const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedId, setExpandedId] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const [formSnapshot, setFormSnapshot] = useState(emptyAnimalForm);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [activeFormTab, setActiveFormTab] = useState("overview");
    const [editingAnimal, setEditingAnimal] = useState(null);

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
            records.forEach((record) => {
                const animalId = record.animal?._id || record.animal;
                if (animalId) codeMap[animalId] = record.tagCode;
            });

            setQrCodes(codeMap);
        } catch {
            // QR search is optional; name/breed search still works
        }
    }

    async function handleSubmitAnimal(e) {
        e.preventDefault();

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
                setMessage(data.message || "Failed to save animal profile.");
                return;
            }

            if (!editingId) {
                const newAnimal = data.animal;

                if (!newAnimal?._id) {
                    // Fallback: server didn't return the new animal
                    closeForm();
                    setMessage("Animal profile created successfully.");
                    fetchAnimals();
                    return;
                }

                setEditingId(newAnimal._id);
                setEditingAnimal(newAnimal);
                setMessage(
                    "Animal saved. You can now fill in Behavioral Assessment, Vaccinations and Medical Records."
                );
            } else {
                setEditingAnimal((current) => data.animal || { ...current, ...payload });
                setMessage("Animal profile updated successfully.");
            }

            setFormSnapshot({ ...animalForm });
            fetchAnimals();
        } catch (error) {
            console.error("Save animal error:", error);
            setMessage("Server error while saving animal profile.");
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
            intakeCondition: animal.intakeCondition || "Unknown",
            availabilityStatus: animal.availabilityStatus || "available",
            adoptionStatus: animal.adoptionStatus || "available",
            fosterStatus: animal.fosterStatus || "none",
            location: animal.location || "RescueBase Shelter",
        };

        setEditingId(animal._id);
        setAnimalForm(editForm);
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
        setFormSnapshot(emptyAnimalForm);
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
                    <label>
                        Name <span className="admin-required">*</span>
                        <input
                            value={animalForm.name}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, name: e.target.value })
                            }
                            required
                        />
                    </label>

                    <label>
                        Type
                        <select
                            value={animalForm.type}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, type: e.target.value })
                            }
                        >
                            <option value="Dog">Dog</option>
                            <option value="Cat">Cat</option>
                            <option value="Other">Other</option>
                        </select>
                    </label>

                    <label>
                        Breed
                        <input
                            value={animalForm.breed}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, breed: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Age
                        <input
                            type="number"
                            min="0"
                            value={animalForm.age}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, age: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Gender
                        <select
                            value={animalForm.gender}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, gender: e.target.value })
                            }
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Unknown">Unknown</option>
                        </select>
                    </label>

                    <label>
                        Size
                        <select
                            value={animalForm.size}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, size: e.target.value })
                            }
                        >
                            <option value="Small">Small</option>
                            <option value="Medium">Medium</option>
                            <option value="Large">Large</option>
                            <option value="Unknown">Unknown</option>
                        </select>
                    </label>

                    <label>
                        Color
                        <input
                            value={animalForm.color}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, color: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Image URL
                        <input
                            value={animalForm.image}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, image: e.target.value })
                            }
                            placeholder="Paste image URL or Upload Below"
                        />

                    </label>

                    <label>
                        Upload Image
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadAnimalImage}
                            disabled={imageUploading}
                        />
                    </label>

                    {animalForm.image ? (
                        <div className="admin-animal-preview admin-animal-wide">
                            <img src={animalForm.image} alt="Animal preview" />
                            <span>{imageUploading ? "Uploading..." : "Image ready"}</span>
                        </div>
                    ) : null}

                    <label>
                        Intake Condition
                        <select
                            value={animalForm.intakeCondition}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    intakeCondition: e.target.value,
                                })
                            }
                        >
                            <option value="Healthy">Healthy</option>
                            <option value="Injured">Injured</option>
                            <option value="Sick">Sick</option>
                            <option value="Under Observation">Under Observation</option>
                            <option value="Unknown">Unknown</option>
                        </select>
                    </label>

                    <label>
                        Availability
                        <select
                            value={animalForm.availabilityStatus}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    availabilityStatus: e.target.value,
                                })
                            }
                        >
                            <option value="available">Available</option>
                            <option value="unavailable">Unavailable</option>
                        </select>
                    </label>

                    <label>
                        Adoption Status
                        <select
                            value={animalForm.adoptionStatus}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    adoptionStatus: e.target.value,
                                })
                            }
                        >
                            <option value="available">Available</option>
                            <option value="pending">Pending</option>
                            <option value="adopted">Adopted</option>
                        </select>
                    </label>

                    <label>
                        Foster Status
                        <select
                            value={animalForm.fosterStatus}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    fosterStatus: e.target.value,
                                })
                            }
                        >
                            <option value="none">None</option>
                            <option value="in_foster">In Foster</option>
                            <option value="completed">Completed</option>
                        </select>
                    </label>

                    <label>
                        Location
                        <input
                            value={animalForm.location}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, location: e.target.value })
                            }
                        />
                    </label>

                    <label className="admin-animal-wide">
                        Description
                        <textarea
                            value={animalForm.description}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    description: e.target.value,
                                })
                            }
                        />
                    </label>

                    <label className="admin-animal-wide">
                        Medical Status
                        <textarea
                            value={animalForm.medicalStatus}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    medicalStatus: e.target.value,
                                })
                            }
                        />
                    </label>

                    <label className="admin-animal-wide">
                        Behavior Notes
                        <textarea
                            value={animalForm.behaviorNotes}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    behaviorNotes: e.target.value,
                                })
                            }
                        />
                    </label>

                    {message && <p className="admin-animal-message">{message}</p>}

                    <button type="submit" disabled={submitting || imageUploading}>
                        {submitting
                            ? "Saving..."
                            : editingId
                                ? "Update Animal"
                                : "Save Animal"}
                    </button>
                </form>
        </div>

        {editingAnimal && (
            <>
                <div className="admin-tab-content" hidden={activeFormTab !== "behavior"}>
                    <BehaviorAssessment key={editingAnimal._id} lockedAnimal={editingAnimal} />
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
                        <option value="All">Species: All</option>
                        <option value="Dog">Species: Dog</option>
                        <option value="Cat">Species: Cat</option>
                        <option value="Other">Species: Other</option>
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
                                        <span>{animal.availabilityStatus}</span>
                                        <span>{animal.adoptionStatus}</span>
                                        <span>{animal.fosterStatus}</span>
                                    </div>
                                </div>

                                <div className="admin-animal-details">
                                    <p><b>Age:</b> {animal.age || 0}</p>
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
                                        <th>Age (yrs)</th>
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
                                                    <td>{animal.age ?? 0}</td>
                                                    <td>{animal.gender}</td>
                                                    <td>
                                                        <StatusPill key={status} status={status} />
                                                    </td>
                                                    <td>{formatIntakeDate(animal.intakeDate)}</td>
                                                    <td>
                                                        {qrCodes[animal._id] ? (
                                                            <span className="admin-qr-chip">
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
                                                                onClick={() =>
                                                                    setExpandedId(isExpanded ? null : animal._id)
                                                                }
                                                            >
                                                                {isExpanded ? "Hide" : "View"}
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

                                                {isExpanded && (
                                                    <tr className="admin-animal-expanded-row">
                                                        <td colSpan={9}>
                                                            <div className="admin-animal-expanded">
                                                                <div><span>Size</span><p>{animal.size}</p></div>
                                                                <div><span>Color</span><p>{animal.color || "—"}</p></div>
                                                                <div><span>Condition</span><p>{animal.intakeCondition}</p></div>
                                                                <div><span>Location</span><p>{animal.location || "RescueBase Shelter"}</p></div>
                                                                <div className="wide"><span>Medical Status</span><p>{animal.medicalStatus || "—"}</p></div>
                                                                <div className="wide"><span>Behavior Notes</span><p>{animal.behaviorNotes || "—"}</p></div>
                                                                <div className="wide"><span>Description</span><p>{animal.description || "—"}</p></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
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

        </section>
    );
}