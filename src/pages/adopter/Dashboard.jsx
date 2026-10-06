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
import "../../styles/adopter/MatchmakingQuiz.css";
import "../../styles/adopter/Recommendations.css";
import "../../styles/adopter/DonationCenter.css";
import "../../styles/adopter/DonationHistory.css";

// Module
import AdoptionApplication from "./modules/AdoptionApplication";
import ApplicationStatus from "./modules/ApplicationStatus";
import BrowsePets from "./modules/BrowsePets";
import MatchmakingQuiz from "./modules/MatchmakingQuiz";
import Recommendations from "./modules/Recommendations";
import DonationCenter from "./modules/DonationCenter";
import DonationHistory from "./modules/DonationHistory";
import LostFound from "../admin/modules/LostFound";
import FeedbackForm from "../FeedbackForm";
import RoleApplication from "./modules/RoleApplication";

const API = import.meta.env.VITE_BACKEND_URL;

const ICON_PATH = "/icons/sidebar/";

const adopterMenu = [
    {
        key: "overview",
        label: "Dashboard",
        icon: "dashboard-brown.svg",
        activeIcon: "dashboard-light.svg",
    },
    {
        key: "browse-pets",
        label: "Browse Pets",
        icon: "brown paw.svg",
        activeIcon: "brown paw-light.svg",
    },
    {
        key: "adoption-application",
        label: "Adoption Application",
        icon: "clipboard-brown.svg",
        activeIcon: "clipboard-light.svg",
    },
    {
        key: "matchmaking-quiz",
        label: "Matchmaking Quiz",
        icon: "quiz-brown.svg",
        activeIcon: "quiz-light.svg",
    },
    {
        key: "application-status",
        label: "Application Status",
        icon: "Status.svg",
        activeIcon: "Status-light.svg",
    },
    {
        key: "lost-found",
        label: "Lost & Found",
        icon: "LostnFound-brown.svg",
        activeIcon: "LostnFound-light.svg",
    },
    {
        key: "recommendations",
        label: "Recommendations",
        icon: "Recommend.svg",
        activeIcon: "Recommend-light.svg",
    },
    {
        key: "donation",
        label: "Donation",
        icon: "donation-brown.svg",
        activeIcon: "donation-light.svg",
    },
    {
        key: "donation-history",
        label: "Donation History",
        icon: "history.svg",
        activeIcon: "history-light.svg",
    },
    {
        key: "role-application",
        label: "Role Application",
        icon: "role-brown.svg",
        activeIcon: "role-light.svg",
    },
    {
        key: "feedback",
        label: "Feedback",
        icon: "Feedback-brown.svg",
        activeIcon: "Feedback-light.svg",
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

function getAuthToken() {
    return localStorage.getItem("token");
}

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

    const token = getAuthToken();

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
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

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

    async function loadNotifications() {
        if (!token) return;

        try {
            const response = await fetch(
                `${API}/api/notifications`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error(data.message || "Failed to load notifications");
                return;
            }

            const notificationList = data.notifications || [];

            setNotifications(notificationList);

            setUnreadCount(
                notificationList.filter(
                    (notification) => !notification.read
                ).length
            );
        } catch (error) {
            console.error("Load notifications error: ", error);
        }
    }

    async function fetchPets() {
        try {
            setPetsLoading(true);
            setPetsError("");

            const response = await fetch(
                `${API}/api/animals?availabilityStatus=available&adoptionStatus=available`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
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

            if (!token) {
                console.error("No rescuebase Auth token found");
                return;
            }

            const response = await fetch(
                `${API}/api/adoptions/user/latest`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
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
            <>
                <section
                    className="adopter-panel"
                    id="available-pets"
                >
                    <div className="browse-pets-panel-heading">
                        <div>
                            <h3>Who's Stealing Your Heart Today?</h3>
                            <p>Pick a pal below to peek at their story and apply today.</p>
                        </div>
                    </div>

                    <div className="browse-pets-filters">
                        <label>
                            Search Pets
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by name, breed, or type"
                            />
                        </label>

                        <label>
                            Animal Type
                            <select
                                value={typeFilter}
                                onChange={(event) => setTypeFilter(event.target.value)}
                            >
                                <option value="all">All Pets</option>
                                <option value="dog">Dogs</option>
                                <option value="cat">Cats</option>
                                <option value="other">Other</option>
                            </select>
                        </label>
                    </div>

                    <div className="browse-pets-list">
                        {petsLoading && (
                            <div className="browse-pets-message">
                                <span>🐾</span>
                                <p>Loading available pets...</p>
                            </div>
                        )}

                        {!petsLoading && petsError && (
                            <div className="browse-pets-message error">
                                <span>!</span>
                                <p>{petsError}</p>
                                <button type="button" onClick={fetchPets}>
                                    Try Again
                                </button>
                            </div>
                        )}

                        {!petsLoading && !petsError && filteredPets.length === 0 && (
                            <div className="browse-pets-message">
                                <span>🐾</span>
                                <p>No available animals matched your search.</p>
                            </div>
                        )}

                        {!petsLoading &&
                            !petsError &&
                            filteredPets.map((pet) => {
                                const isSelected = selectedPet._id === pet._id;

                                return (
                                    <article
                                        key={pet._id}
                                        className={isSelected ? "browse-pet-card active" : "browse-pet-card"}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedPet(pet)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                setSelectedPet(pet);
                                            }
                                        }}
                                    >
                                        <div className="browse-pet-card-image">
                                            {pet.image ? (
                                                <img src={pet.image} alt={pet.name} />
                                            ) : (
                                                <span>{pet.icon || "🐾"}</span>
                                            )}
                                        </div>

                                        <div className="browse-pet-card-content">
                                            <div>
                                                <h3>{pet.name}</h3>
                                                <span className={`adopter-status ${pet.status || "not_available"}`}>
                                                    {String(pet.status || "not_available").replaceAll("_", " ")}
                                                </span>
                                            </div>

                                            <p>
                                                {pet.type || "Pet"} • {pet.breed || "Unknown breed"}
                                            </p>

                                            <small>
                                                {pet.age || "Unknown age"} • {pet.gender || "Unknown"} •{" "}
                                                {pet.size || "Unknown size"}
                                            </small>
                                        </div>

                                        <span className="browse-pet-card-arrow">→</span>
                                    </article>
                                );
                            })}
                    </div>
                </section>
            </>
        );
    }

    function renderPetDetail() {
    return (
        <aside className="adopter-panel adopter-detail-panel">
            <div className="browse-pet-main-image">
                {selectedPet.image ? (
                    <img src={selectedPet.image} alt={selectedPet.name} />
                ) : (
                    <span>{selectedPet.icon || "🐾"}</span>
                )}
            </div>

            <div className="browse-pet-title">
                <span className={`adopter-status ${selectedPet.status || "not_available"}`}>
                    {(selectedPet.status || "not_available").replace("_", " ")}
                </span>

                <h2>{selectedPet.name}</h2>

                <p>
                    {selectedPet.type || "Pet"} • {selectedPet.breed || "Unknown breed"}
                </p>
            </div>

            <div className="browse-pet-details-grid">
                <article>
                    <span>Age</span>
                    <strong>{selectedPet.age || "Unknown"}</strong>
                </article>
                <article>
                    <span>Gender</span>
                    <strong>{selectedPet.gender || "Unknown"}</strong>
                </article>
                <article>
                    <span>Size</span>
                    <strong>{selectedPet.size || "Unknown"}</strong>
                </article>
                <article>
                    <span>Location</span>
                    <strong>{selectedPet.location || "RescueBase Shelter"}</strong>
                </article>
            </div>

            <section className="browse-pet-information">
                <h3>Personality</h3>
                <p>{selectedPet.personality || "Behavior information has not been added yet."}</p>
            </section>

            <section className="browse-pet-information">
                <h3>Ideal Home</h3>
                <p>{selectedPet.idealHome || "Contact the shelter for additional information."}</p>
            </section>

            <section className="browse-pet-information">
                <h3>Health Status</h3>
                <p>{selectedPet.health || "Health information is not available."}</p>
            </section>

            <section className="browse-pet-information">
                <h3>Rescue Story</h3>
                <p>{selectedPet.story || `${selectedPet.name} is currently under the care of RescueBase.`}</p>
            </section>

            <button
                type="button"
                className="browse-pet-apply-button"
                onClick={() => handleApply(selectedPet)}
                disabled={selectedPet.status !== "available" || hasPendingApplication}
            >
                {hasPendingApplication
                    ? `Pending application for ${applicationStatus?.petName || "another animal"}`
                    : selectedPet.status === "available"
                        ? `Apply to Adopt ${selectedPet.name}`
                        : "Currently Not Available"}
            </button>
        </aside>
    );
}
    
    function renderOverview() {
        return (
            <div className="adopter-overview-layout">
                <div className="adopter-overview-main">
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
                </div>

                {renderPetDetail()}
            </div>
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

        if (activeAdopterPage === "matchmaking-quiz") {
            let currentUser = null;

            try {
                currentUser = JSON.parse(
                    localStorage.getItem("rescuebase_user") || "null"
                );
            } catch {
                currentUser = null;
            }

            return (
                <MatchmakingQuiz
                    user={currentUser}
                    onCompleted={() =>
                        setActiveAdopterPage("recommendations")
                    }
                />
            );
        }

        if (activeAdopterPage === "recommendations") {
            return (
                <Recommendations
                    pets={pets}
                    loading={petsLoading}
                    error={petsError}
                    onRefresh={fetchPets}
                    onApply={handleApply}
                    hasPendingApplication={hasPendingApplication}
                    applicationStatus={applicationStatus}
                    onTakeQuiz={() =>
                        setActiveAdopterPage("matchmaking-quiz")
                    }
                />
            );
        }

        if (activeAdopterPage === "donation") {
            return <DonationCenter />
        }

        if (activeAdopterPage === "donation-history") {
            return <DonationHistory />
        }

        if (activeAdopterPage === "lost-found") {
            return <LostFound />
        }

        if (activeAdopterPage === "feedback") {
            return <FeedbackForm />
        }

        if (activeAdopterPage === "role-application") {
            return <RoleApplication />
        }

        return renderOverview();
    }

    async function handleNotificationClick(notification) {
        if (!notification.read && token) {
            try {
                const response = await fetch(
                    `${API}/api/notifications/${notification._id}/read`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    console.error(
                        data.message ||
                        "Failed to mark notification as read."
                    );
                    return;
                }

                await loadNotifications();
            } catch (error) {
                console.error(
                    "Mark notification as read error:",
                    error
                );
                return;
            }
        }

        switch (notification.type) {
            case "adoption_update":
                setActiveAdopterPage("browse-pets");
                break;

            case "application_update":
                setActiveAdopterPage("application-status");
                break;

            default:
                setActiveAdopterPage("overview");
                break;
        }

        setNotificationOpen(false);
    }

    useEffect(() => {
        refreshDashboard();
        loadNotifications();

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
                                        {item.icon && (
                                            <>
                                                <img
                                                    className="adopter-menu-icon icon-default"
                                                    src={ICON_PATH + item.icon}
                                                    alt=""
                                                    aria-hidden="true"
                                                />
                                                <img
                                                    className="adopter-menu-icon icon-active"
                                                    src={ICON_PATH + item.activeIcon}
                                                    alt=""
                                                    aria-hidden="true"
                                                />
                                            </>
                                        )}

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
                            className={`adopter-notification-btn ${notificationOpen ? "open" : ""}`}
                            aria-label="Notifications"
                            title="Notifications"
                            onClick={() =>
                                setNotificationOpen(
                                    (current) =>
                                        !current
                                )
                            }
                        >
                            <img
                                className="adopter-notification-icon icon-default"
                                src={ICON_PATH + "notification-brown.svg"}
                                alt=""
                                aria-hidden="true"
                            />
                            <img
                                className="adopter-notification-icon icon-active"
                                src={ICON_PATH + "notification-light.svg"}
                                alt=""
                                aria-hidden="true"
                            />

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
                                                key={notification._id}
                                                type="button"
                                                className={`adopter-notification-item ${notification.read ? "" : "unread"
                                                    }`}
                                                onClick={() =>
                                                    handleNotificationClick(notification)
                                                }
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