import {
    useEffect,
    useMemo,
    useState,
} from "react";

// Assets
import assets from "../../data/assets.json";

// CSS
import "../../styles/adopter/Dashboard.css";
import "../../styles/adopter/ApplicationStatus.css";
import "../../styles/adopter/BrowsePets.css";

// Module
import AdoptionApplication from "./modules/AdoptionApplication";
import ApplicationStatus from "./modules/ApplicationStatus";
import BrowsePets from "./modules/BrowsePets";

const API = import.meta.env.VITE_BACKEND_URL;

const adopterMenu = [
    {
        key: "overview",
        label: "Dashboard",
    },
    {
        key: "browse-pets",
        label: "Browse Pets",
    },
    {
        key: "adoption-application",
        label: "Adoption Application",
    },
    {
        key: "application-status",
        label: "Application Status",
    },
];

const emptyPet = {
    id: "",
    _id: "",
    name: "No available pets",
    type: "Pet",
    breed: "Not available",
    age: "—",
    gender: "Unknown",
    size: "Unknown",
    status: "not_available",
    location: "RescueBase Shelter",
    personality: "No animal selected.",
    idealHome: "Please check again later.",
    health: "Not available",
    story: "There are currently no available animals.",
    description: "",
    icon: "🐾",
    image: "",
};

function getSavedUser() {
    try {
        return JSON.parse(
            localStorage.getItem("rescuebase_user") || "{}"
        );
    } catch {
        return {};
    }
}

function getAdopterPageTitle(activeAdopterPage) {
    const currentItem = adopterMenu.find(
        (item) => item.key === activeAdopterPage
    );

    return currentItem?.label || "Dashboard";
}

export default function Dashboard({ onLogout }) {
    const savedUser = getSavedUser();

    const savedEmail = String(savedUser.email || "")
        .trim()
        .toLowerCase();

    const [activeAdopterPage, setActiveAdopterPage] =
        useState("overview");

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    const [pets, setPets] = useState([]);
    const [petsLoading, setPetsLoading] = useState(true);
    const [petsError, setPetsError] = useState("");

    const [selectedPet, setSelectedPet] =
        useState(emptyPet);

    const [applicationStatus, setApplicationStatus] =
        useState(() => {
            try {
                return JSON.parse(
                    localStorage.getItem(
                        "rescuebase_pending_application"
                    ) || "null"
                );
            } catch {
                return null;
            }
        });

    const [applicationLoading, setApplicationLoading] =
        useState(true);

    const [notificationOpen, setNotificationOpen] =
        useState(false);

    const hasPendingApplication =
        applicationStatus?.status === "pending";

    const isRejectedApplication =
        applicationStatus?.status === "rejected";

    const isApprovedApplication =
        applicationStatus?.status === "approved";

    const availablePets = useMemo(() => {
        return pets.filter(
            (pet) => pet.status === "available"
        ).length;
    }, [pets]);

    const filteredPets = useMemo(() => {
        const normalizedSearch = search
            .trim()
            .toLowerCase();

        return pets.filter((pet) => {
            const petType = String(
                pet.type || ""
            ).toLowerCase();

            const petName = String(
                pet.name || ""
            ).toLowerCase();

            const petBreed = String(
                pet.breed || ""
            ).toLowerCase();

            const matchesType =
                typeFilter === "all" ||
                petType === typeFilter;

            const matchesSearch =
                !normalizedSearch ||
                petName.includes(normalizedSearch) ||
                petBreed.includes(normalizedSearch) ||
                petType.includes(normalizedSearch);

            return matchesType && matchesSearch;
        });
    }, [pets, search, typeFilter]);

    const notifications = useMemo(() => {
        if (!applicationStatus) {
            return [];
        }

        if (hasPendingApplication) {
            return [
                {
                    id: "pending-adoption",
                    title: "Pending Adoption Application",
                    message: `Your application for ${applicationStatus.petName} is waiting for review.`,
                },
            ];
        }

        if (isApprovedApplication) {
            return [
                {
                    id: "approved-adoption",
                    title: "Application Approved",
                    message: `Your application for ${applicationStatus.petName} was approved.`,
                },
            ];
        }

        if (isRejectedApplication) {
            return [
                {
                    id: "rejected-adoption",
                    title: "Application Update",
                    message: `Your application for ${applicationStatus.petName} was rejected.`,
                },
            ];
        }

        return [];
    }, [
        applicationStatus,
        hasPendingApplication,
        isApprovedApplication,
        isRejectedApplication,
    ]);

    async function fetchPets() {
        try {
            setPetsLoading(true);
            setPetsError("");

            const response = await fetch(
                `${API}/api/animals?availabilityStatus=available&adoptionStatus=available`
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setPets([]);
                setSelectedPet(emptyPet);

                setPetsError(
                    data.message ||
                    "Failed to load available pets."
                );

                return;
            }

            const animals = Array.isArray(data.animals)
                ? data.animals
                : [];

            const normalizedPets = animals.map(
                (animal) => {
                    const age = Number(
                        animal.age || 0
                    );

                    return {
                        ...animal,

                        id: animal._id,

                        status:
                            animal.availabilityStatus ===
                                "available" &&
                                animal.adoptionStatus ===
                                "available"
                                ? "available"
                                : "not_available",

                        age: `${age} ${age === 1 ? "year" : "years"
                            }`,

                        personality:
                            animal.behaviorNotes ||
                            "Behavior information has not been added yet.",

                        idealHome:
                            animal.description ||
                            "Contact the shelter to learn about the ideal home.",

                        health:
                            animal.medicalStatus ||
                            animal.intakeCondition ||
                            "Health information is not available.",

                        story:
                            animal.description ||
                            `${animal.name} is currently under the care of RescueBase.`,

                        icon:
                            animal.type === "Dog"
                                ? "🐶"
                                : animal.type === "Cat"
                                    ? "🐱"
                                    : "🐾",
                    };
                }
            );

            setPets(normalizedPets);

            setSelectedPet((currentPet) => {
                const existingPet =
                    normalizedPets.find(
                        (pet) =>
                            pet._id ===
                            currentPet?._id
                    );

                return (
                    existingPet ||
                    normalizedPets[0] ||
                    emptyPet
                );
            });
        } catch (error) {
            console.error(
                "Fetch available pets error:",
                error
            );

            setPets([]);
            setSelectedPet(emptyPet);

            setPetsError(
                "Server error while loading available pets."
            );
        } finally {
            setPetsLoading(false);
        }
    }

    async function fetchApplicationStatus() {
        try {
            setApplicationLoading(true);

            if (!savedEmail) {
                setApplicationStatus(null);
                return;
            }

            const response = await fetch(
                `${API}/api/adoptions/user/${encodeURIComponent(
                    savedEmail
                )}/latest`
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error(
                    data.message ||
                    "Failed to load application status."
                );

                return;
            }

            const application = data.application;

            if (!application) {
                localStorage.removeItem(
                    "rescuebase_pending_application"
                );

                setApplicationStatus(null);
                return;
            }

            const updatedStatus = {
                status:
                    application.status || "pending",

                petName:
                    application.petName ||
                    application.animalId?.name ||
                    "Selected Pet",

                petBreed:
                    application.petBreed ||
                    application.animalId?.breed ||
                    "",

                petImage:
                    application.petImage ||
                    application.animalId?.image ||
                    "",

                animalId:
                    application.animalId?._id ||
                    application.animalId ||
                    null,

                applicationId:
                    application._id,

                submittedAt:
                    application.createdAt,

                updatedAt:
                    application.updatedAt,

                interviewSchedule:
                    application.interviewSchedule ||
                    null,

                rejectionReason:
                    application.rejectionReason ||
                    "",

                reviewNotes:
                    application.reviewNotes || "",

                documentsVerified: Boolean(
                    application.documentsVerified
                ),
            };

            setApplicationStatus(updatedStatus);

            if (
                updatedStatus.status === "pending"
            ) {
                localStorage.setItem(
                    "rescuebase_pending_application",
                    JSON.stringify(updatedStatus)
                );
            } else {
                localStorage.removeItem(
                    "rescuebase_pending_application"
                );
            }
        } catch (error) {
            console.error(
                "Fetch adopter application status error:",
                error
            );
        } finally {
            setApplicationLoading(false);
        }
    }

    async function refreshDashboard() {
        await Promise.all([
            fetchPets(),
            fetchApplicationStatus(),
        ]);
    }

    function handleSidebarClick(item) {
        if (
            item.key === "adoption-application"
        ) {
            if (hasPendingApplication) {
                setActiveAdopterPage("overview");
                return;
            }

            if (!selectedPet?._id) {
                setActiveAdopterPage("browse-pets");
                return;
            }
        }

        setActiveAdopterPage(item.key);
        setNotificationOpen(false);
    }

    function handleApply(pet) {
        if (!pet?._id) {
            return;
        }

        if (pet.status !== "available") {
            return;
        }

        if (hasPendingApplication) {
            setActiveAdopterPage("overview");
            return;
        }

        setSelectedPet(pet);
        setActiveAdopterPage(
            "adoption-application"
        );
    }

    function handleLogout() {
        localStorage.removeItem(
            "rescuebase_user"
        );

        localStorage.removeItem(
            "rescuebase_pending_application"
        );

        onLogout?.();
    }

    function formatApplicationDate(dateValue) {
        if (!dateValue) {
            return "Date not available";
        }

        const parsedDate = new Date(dateValue);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Date not available";
        }

        return parsedDate.toLocaleDateString(
            "en-PH",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
            }
        );
    }

    function renderApplicationBanner() {
        if (applicationLoading) {
            return null;
        }

        if (!applicationStatus) {
            return null;
        }

        return (
            <section
                className={`adopter-application-banner ${applicationStatus.status}`}
            >
                <div className="adopter-application-banner-image">
                    {applicationStatus.petImage ? (
                        <img
                            src={
                                applicationStatus.petImage
                            }
                            alt={
                                applicationStatus.petName
                            }
                        />
                    ) : (
                        <span>🐾</span>
                    )}
                </div>

                <div className="adopter-application-banner-content">
                    <span
                        className={`adopter-status ${applicationStatus.status}`}
                    >
                        {applicationStatus.status}
                    </span>

                    <h2>
                        Application for{" "}
                        {applicationStatus.petName}
                    </h2>

                    <p>
                        {applicationStatus.petBreed ||
                            "Breed not available"}
                    </p>

                    <small>
                        Submitted on{" "}
                        {formatApplicationDate(
                            applicationStatus.submittedAt
                        )}
                    </small>

                    {hasPendingApplication && (
                        <p>
                            Your application is currently
                            waiting for shelter review.
                        </p>
                    )}

                    {isApprovedApplication && (
                        <p>
                            Your application has been
                            approved. Please wait for
                            further instructions from the
                            shelter.
                        </p>
                    )}

                    {isRejectedApplication && (
                        <>
                            <p>
                                Your application was not
                                approved.
                            </p>

                            {applicationStatus.rejectionReason && (
                                <p>
                                    <strong>
                                        Reason:
                                    </strong>{" "}
                                    {
                                        applicationStatus.rejectionReason
                                    }
                                </p>
                            )}
                        </>
                    )}
                </div>
            </section>
        );
    }

    function renderPetBrowser() {
        return (
            <section className="adopter-content-grid">
                <section
                    className="adopter-panel"
                    id="available-pets"
                >
                    <div className="adopter-panel-heading">
                        <div>
                            <h2>Available Pets</h2>

                            <p>
                                Select a pet to view its
                                details and submit an
                                application.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={fetchPets}
                            disabled={petsLoading}
                        >
                            Refresh
                        </button>
                    </div>

                    <div className="adopter-filters">
                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search pet name, breed, or type"
                        />

                        <select
                            value={typeFilter}
                            onChange={(event) =>
                                setTypeFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                All Pets
                            </option>

                            <option value="dog">
                                Dogs
                            </option>

                            <option value="cat">
                                Cats
                            </option>
                        </select>
                    </div>

                    <div className="adopter-pet-list">
                        {petsLoading && (
                            <p className="adopter-pets-message">
                                Loading available pets...
                            </p>
                        )}

                        {petsError && (
                            <p className="adopter-pets-message">
                                {petsError}
                            </p>
                        )}

                        {!petsLoading &&
                            !petsError &&
                            filteredPets.length ===
                            0 && (
                                <p className="adopter-pets-message">
                                    No available pets
                                    matched your search.
                                </p>
                            )}

                        {!petsLoading &&
                            !petsError &&
                            filteredPets.map((pet) => (
                                <article
                                    key={pet._id}
                                    className={
                                        selectedPet._id ===
                                            pet._id
                                            ? "adopter-pet-card active"
                                            : "adopter-pet-card"
                                    }
                                    onClick={() =>
                                        setSelectedPet(
                                            pet
                                        )
                                    }
                                >
                                    <div className="adopter-pet-card-icon">
                                        {pet.image ? (
                                            <img
                                                src={
                                                    pet.image
                                                }
                                                alt={
                                                    pet.name
                                                }
                                            />
                                        ) : (
                                            pet.icon
                                        )}
                                    </div>

                                    <div>
                                        <h3>
                                            {pet.name}
                                        </h3>

                                        <p>
                                            {pet.type} •{" "}
                                            {pet.breed}
                                        </p>

                                        <small>
                                            {pet.age} •{" "}
                                            {pet.size}
                                        </small>
                                    </div>

                                    <span
                                        className={`adopter-status ${pet.status}`}
                                    >
                                        {pet.status.replace(
                                            "_",
                                            " "
                                        )}
                                    </span>
                                </article>
                            ))}
                    </div>
                </section>

                <aside className="adopter-panel adopter-detail-panel">
                    <div className="adopter-detail-header">
                        <div className="adopter-detail-icon">
                            {selectedPet.image ? (
                                <img
                                    src={
                                        selectedPet.image
                                    }
                                    alt={
                                        selectedPet.name
                                    }
                                />
                            ) : (
                                selectedPet.icon
                            )}
                        </div>

                        <div>
                            <span
                                className={`adopter-status ${selectedPet.status}`}
                            >
                                {selectedPet.status.replace(
                                    "_",
                                    " "
                                )}
                            </span>

                            <h2>
                                {selectedPet.name}
                            </h2>

                            <p>
                                {selectedPet.type} •{" "}
                                {selectedPet.breed}
                            </p>
                        </div>
                    </div>

                    <div className="adopter-detail-grid">
                        <article>
                            <span>Age</span>
                            <strong>
                                {selectedPet.age}
                            </strong>
                        </article>

                        <article>
                            <span>Gender</span>
                            <strong>
                                {selectedPet.gender}
                            </strong>
                        </article>

                        <article>
                            <span>Size</span>
                            <strong>
                                {selectedPet.size}
                            </strong>
                        </article>

                        <article>
                            <span>Location</span>
                            <strong>
                                {selectedPet.location}
                            </strong>
                        </article>
                    </div>

                    <div className="adopter-detail-section">
                        <h3>Personality</h3>
                        <p>
                            {selectedPet.personality}
                        </p>
                    </div>

                    <div className="adopter-detail-section">
                        <h3>Ideal Home</h3>
                        <p>
                            {selectedPet.idealHome}
                        </p>
                    </div>

                    <div className="adopter-detail-section">
                        <h3>Health Status</h3>
                        <p>{selectedPet.health}</p>
                    </div>

                    <div className="adopter-detail-section">
                        <h3>Story</h3>
                        <p>{selectedPet.story}</p>
                    </div>

                    <button
                        type="button"
                        className="adopter-apply-button"
                        onClick={() =>
                            handleApply(selectedPet)
                        }
                        disabled={
                            selectedPet.status !==
                            "available" ||
                            hasPendingApplication
                        }
                    >
                        {hasPendingApplication
                            ? `Pending application: ${applicationStatus.petName}`
                            : selectedPet.status ===
                                "available"
                                ? `Apply to adopt ${selectedPet.name}`
                                : "Currently Not Available"}
                    </button>
                </aside>
            </section>
        );
    }

    function renderOverview() {
        return (
            <>
                <section className="adopter-hero">
                    <div className="adopter-hero-content">
                        <span>
                            RescueBase Matching
                        </span>

                        <h2>
                            Meet your possible new
                            companion.
                        </h2>

                        <p>
                            Browse available rescued pets,
                            check their details, and submit
                            an adoption application when
                            you find a match.
                        </p>

                        <div className="adopter-hero-actions">
                            <button
                                type="button"
                                onClick={() =>
                                    setActiveAdopterPage(
                                        "browse-pets"
                                    )
                                }
                            >
                                Browse Pets
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    handleApply(
                                        selectedPet
                                    )
                                }
                                disabled={
                                    selectedPet.status !==
                                    "available" ||
                                    hasPendingApplication
                                }
                            >
                                {hasPendingApplication
                                    ? `Pending application for ${applicationStatus.petName}`
                                    : `Apply for ${selectedPet.name}`}
                            </button>
                        </div>
                    </div>

                    <div className="adopter-featured-pet">
                        <div className="adopter-pet-icon">
                            {selectedPet.image ? (
                                <img
                                    src={
                                        selectedPet.image
                                    }
                                    alt={
                                        selectedPet.name
                                    }
                                />
                            ) : (
                                selectedPet.icon
                            )}
                        </div>

                        <span
                            className={`adopter-status ${selectedPet.status}`}
                        >
                            {selectedPet.status.replace(
                                "_",
                                " "
                            )}
                        </span>

                        <h3>{selectedPet.name}</h3>

                        <p>
                            {selectedPet.breed} •{" "}
                            {selectedPet.age} •{" "}
                            {selectedPet.gender}
                        </p>
                    </div>
                </section>

                <section className="adopter-stats">
                    <article>
                        <span>Available Pets</span>
                        <strong>
                            {availablePets}
                        </strong>
                    </article>

                    <article>
                        <span>Pet Categories</span>
                        <strong>Dog / Cat</strong>
                    </article>

                    <article>
                        <span>
                            Application Status
                        </span>

                        <strong>
                            {applicationLoading
                                ? "Loading"
                                : hasPendingApplication
                                    ? "Pending"
                                    : isRejectedApplication
                                        ? "Rejected"
                                        : isApprovedApplication
                                            ? "Approved"
                                            : "Ready"}
                        </strong>

                        {applicationStatus?.petName && (
                            <small>
                                For{" "}
                                {
                                    applicationStatus.petName
                                }
                            </small>
                        )}
                    </article>
                </section>

                {renderApplicationBanner()}

                {renderPetBrowser()}
            </>
        );
    }

    function renderAdopterContent() {
        if (
            activeAdopterPage ===
            "adoption-application"
        ) {
            return (
                <AdoptionApplication
                    pet={selectedPet}
                    onBack={() =>
                        setActiveAdopterPage(
                            "browse-pets"
                        )
                    }
                    onApplicationSubmitted={async () => {
                        await refreshDashboard();

                        setActiveAdopterPage(
                            "overview"
                        );
                    }}
                />
            );
        }

        if (
            activeAdopterPage ===
            "application-status"
        ) {
            return (
                <ApplicationStatus
                    application={applicationStatus}
                    loading={applicationLoading}
                    onRefresh={fetchApplicationStatus}
                    onBrowsePets={() =>
                        setActiveAdopterPage("browse-pets")
                    }
                />
            )
        }

        if (
            activeAdopterPage === "browse-pets"
        ) {
            return (
                <BrowsePets
                    pets={pets}
                    loading={petsLoading}
                    error={petsError}
                    search={search}
                    setSearch={setSearch}
                    typeFilter={typeFilter}
                    setTypeFilter={setTypeFilter}
                    filteredPets={filteredPets}
                    selectedPet={selectedPet}
                    setSelectedPet={setSelectedPet}
                    hasPendingApplication={hasPendingApplication}
                    applicationStatus={applicationStatus}
                    onApply={handleApply}
                    onRefresh={fetchPets}
                />
            );
        }

        return renderOverview();
    }

    useEffect(() => {
        refreshDashboard();

        const interval = setInterval(() => {
            fetchApplicationStatus();
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [savedEmail]);

    return (
        <main className="adopter-dashboard-page">
            <aside className="adopter-sidebar">
                <button
                    type="button"
                    className="adopter-logo"
                    onClick={() =>
                        setActiveAdopterPage(
                            "overview"
                        )
                    }
                >
                    <img
                        src={assets.logo}
                        alt="RescueBase logo"
                    />

                    <span>RescueBase</span>
                </button>

                <nav className="adopter-menu">
                    {adopterMenu.map((item) => {
                        const isActive =
                            activeAdopterPage ===
                            item.key;

                        const applicationDisabled =
                            item.key ===
                            "adoption-application" &&
                            (hasPendingApplication ||
                                !selectedPet?._id);

                        return (
                            <div
                                className="adopter-menu-group"
                                key={item.key}
                            >
                                <button
                                    type="button"
                                    title={item.label}
                                    className={
                                        isActive
                                            ? "active"
                                            : ""
                                    }
                                    disabled={
                                        applicationDisabled
                                    }
                                    onClick={() =>
                                        handleSidebarClick(
                                            item
                                        )
                                    }
                                >
                                    <div className="adopter-menu-text">
                                        <strong>
                                            {item.label}
                                        </strong>
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </nav>

                <button
                    className="adopter-user-card"
                    type="button"
                    onClick={handleLogout}
                >
                    <div className="adopter-user-avatar">
                        {savedUser.profileImage ? (
                            <img
                                src={
                                    savedUser.profileImage
                                }
                                alt={
                                    savedUser.name ||
                                    savedUser.username ||
                                    "Adopter"
                                }
                            />
                        ) : (
                            <span>👤</span>
                        )}
                    </div>

                    <div>
                        <strong>
                            {savedUser.name ||
                                savedUser.username ||
                                "Adopter"}
                        </strong>

                        <small>Adopter</small>
                    </div>

                    <span>→</span>
                </button>
            </aside>

            <section className="adopter-main">
                <header className="adopter-dashboard-topbar">
                    <div>
                        <span className="adopter-dashboard-eyebrow">
                            Adopter Portal
                        </span>

                        <h1>
                            {getAdopterPageTitle(
                                activeAdopterPage
                            )}
                        </h1>
                    </div>

                    <div className="adopter-notification-wrap">
                        <button
                            type="button"
                            className="adopter-notification-btn"
                            onClick={() =>
                                setNotificationOpen(
                                    (current) =>
                                        !current
                                )
                            }
                        >
                            Notifications

                            {notifications.length >
                                0 && (
                                    <span>
                                        {
                                            notifications.length
                                        }
                                    </span>
                                )}
                        </button>

                        {notificationOpen && (
                            <div className="adopter-notification-dropdown">
                                <div className="adopter-notification-header">
                                    <strong>
                                        Notifications
                                    </strong>

                                    <small>
                                        {
                                            notifications.length
                                        }{" "}
                                        update(s)
                                    </small>
                                </div>

                                {notifications.length ===
                                    0 ? (
                                    <p className="adopter-notification-empty">
                                        No new
                                        notifications.
                                    </p>
                                ) : (
                                    notifications.map(
                                        (notification) => (
                                            <button
                                                key={
                                                    notification.id
                                                }
                                                type="button"
                                                className="adopter-notification-item"
                                                onClick={() => {
                                                    setActiveAdopterPage(
                                                        "overview"
                                                    );

                                                    setNotificationOpen(
                                                        false
                                                    );
                                                }}
                                            >
                                                <strong>
                                                    {
                                                        notification.title
                                                    }
                                                </strong>

                                                <span>
                                                    {
                                                        notification.message
                                                    }
                                                </span>
                                            </button>
                                        )
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </header>

                <section className="adopter-dashboard-content">
                    {renderAdopterContent()}
                </section>
            </section>
        </main>
    );
}