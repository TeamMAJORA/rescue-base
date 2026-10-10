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
import PetList from "../../components/adopter/PetList";
import PetDetailPanel from "../../components/adopter/PetDetailPanel";
import { formatAge } from "../../utils/formatAge";

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
    personalityTags: [],
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

    const [browseStartFilter, setBrowseStartFilter] = useState("all");

    useEffect(() => {
        if (activeAdopterPage !== "browse-pets") {
            setBrowseStartFilter("all");
        }
    }, [activeAdopterPage]);
    
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    const [pets, setPets] = useState([]);
    const [petsLoading, setPetsLoading] = useState(true);
    const [petsError, setPetsError] = useState("");

    const [hasTakenQuiz] = useState(() => {
    try {
        return Boolean(localStorage.getItem("rescuebase_matchmaking_results"));
    } catch {
        return false;
    }
    });

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

    
    const QUIZ_TOTAL_STEPS = 3;

    const savedPetsCount = (() => {
        try {
            return (JSON.parse(localStorage.getItem("rescuebase_saved_pets")) || []).length;
        } catch {
            return 0;
        }
    })();

    const goodMatchesCount = (() => {
        try {
            const results = JSON.parse(
                localStorage.getItem("rescuebase_matchmaking_results") || "null"
            );
            return (results?.matches || []).filter(
                (match) => match.eligible && Number(match.score) >= 60
            ).length;
        } catch {
            return 0;
        }
    })();

    function getNextStep() {
        const petName = applicationStatus?.petName || "your pet";

        if (isApprovedApplication) {
            return {
                tone: "success",
                label: "Action Needed",
                icon: "✅",
                title: `Meet ${petName}!`,
                linkText: "Check your interview schedule",
                page: "application-status",
            };
        }

        if (isRejectedApplication) {
            return {
                tone: "danger",
                label: "Action Needed",
                icon: "💔",
                title: "Find another match",
                linkText: "See your matches",
                page: hasTakenQuiz ? "recommendations" : "browse-pets",
            };
        }

        if (!hasTakenQuiz) {
            return {
                tone: "action",
                label: "Action Needed",
                icon: null,
                title: "Finish your match quiz",
                linkText: `${QUIZ_TOTAL_STEPS} quick steps`,
                page: "matchmaking-quiz",
            };
        }

        if (hasPendingApplication) {
            return {
                tone: "info",
                label: "In Review",
                icon: "⏳",
                title: `Application for ${petName}`,
                linkText: "We'll notify you",
                page: "application-status",
            };
        }

        return {
            tone: "neutral",
            label: "All Set",
            icon: "🐾",
            title: "You're all caught up",
            linkText: `${availablePets} pets available`,
            page: "browse-pets",
        };
    }

    const nextStep = getNextStep();


    const featuredMatch = (() => {
        try {
            const results = JSON.parse(
                localStorage.getItem("rescuebase_matchmaking_results") || "null"
            );

            const best = (results?.matches || [])
                .filter((match) => match.eligible && match.score !== null)
                .sort((a, b) => Number(b.score) - Number(a.score))
                .find((match) =>
                    pets.some((pet) => pet._id === String(match.animalId))
                );

            if (!best) return null;

            return {
                pet: pets.find((pet) => pet._id === String(best.animalId)),
                score: Math.round(Number(best.score)),
            };
        } catch {
            return null;
        }
    })();

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

                        age: formatAge(animal.age),

                        personalityTags:
                            animal.personality?.tags || [],

                        personality:
                            animal.personality?.summary ||
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
            <PetList
                className="browse-pets-list-panel"
                id="available-pets"
                loading={petsLoading}
                error={petsError}
                search={search}
                setSearch={setSearch}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                filteredPets={filteredPets}
                selectedPet={selectedPet}
                setSelectedPet={setSelectedPet}
                onRefresh={fetchPets}
            />
        );
    }

    function renderPetDetail() {
        return (
            <PetDetailPanel
                className="browse-pet-details-panel"
                pet={selectedPet}
                hasPendingApplication={hasPendingApplication}
                applicationStatus={applicationStatus}
                onApply={handleApply}
            />
        );
    }

    function renderOverview() {
        return (
            <div className="adopter-overview-layout">
                <div className="adopter-overview-main">
                    <section className="adopter-hero">
                        <div className="adopter-hero-content">
                            <span className="adopter-hero-chip">
                                RescueBase Matching
                            </span>

                            <h2>Let's find your perfect companion</h2>

                            <p>
                                Answer {QUIZ_TOTAL_STEPS} quick steps about your home and
                                we'll pair you with pets that fit your life.
                            </p>

                            <ol className="adopter-hero-steps">
                                <li><b>1</b> Your space</li>
                                <li><b>2</b> Your experience</li>
                                <li><b>3</b> Energy level</li>
                                <li className="adopter-hero-time">⏱ ~2 min</li>
                            </ol>

                            <div className="adopter-hero-actions">
                                <button
                                    type="button"
                                    onClick={() => setActiveAdopterPage("matchmaking-quiz")}
                                >
                                    {hasTakenQuiz ? "Retake Matching Quiz" : "Take Matching Quiz"}
                                    <img src={assets.icons.lightHeart} alt="" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveAdopterPage("browse-pets")}
                                >
                                    Browse All Pets
                                </button>
                            </div>

                            <small className="adopter-hero-note">
                                ✓ Free · no account changes needed
                            </small>
                        </div>

                        <div className="adopter-hero-side">
                            <span className="adopter-hero-side-label">
                                {featuredMatch ? "Your top match" : "Your match"}
                            </span>

                            {featuredMatch ? (
                                <article className="adopter-match-card">
                                    <div className="adopter-match-photo">
                                        {featuredMatch.pet.image ? (
                                            <img
                                                src={featuredMatch.pet.image}
                                                alt={featuredMatch.pet.name}
                                            />
                                        ) : (
                                            <img src={assets.icons.logoPlaceholder} alt="" />
                                        )}
                                        <span className="adopter-match-badge">Available</span>
                                    </div>

                                    <div className="adopter-match-info">
                                        <h3>{featuredMatch.pet.name}</h3>
                                        <p>
                                            {[featuredMatch.pet.breed, featuredMatch.pet.gender]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </p>

                                        <div className="adopter-match-tags">
                                            <span>{featuredMatch.pet.age}</span>
                                            {featuredMatch.pet.size && (
                                                <span>{featuredMatch.pet.size}</span>
                                            )}
                                        </div>

                                        <div className="adopter-match-score">
                                            <span>Match with you</span>
                                            <strong>{featuredMatch.score}%</strong>
                                        </div>
                                        <div className="adopter-match-bar">
                                            <i style={{ width: `${featuredMatch.score}%` }} />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setSelectedPet(featuredMatch.pet)}
                                        >
                                            Meet {featuredMatch.pet.name} →
                                        </button>
                                    </div>
                                </article>
                            ) : (
                                <div className="adopter-hero-placeholder">
                                    <img src={assets.icons.logoPlaceholder} alt="" />
                                    <strong>Your match will appear here</strong>
                                    <small>Take the quiz to see who fits you best.</small>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="adopter-stats">
                        <article className={`adopter-next-step is-${nextStep.tone}`}>
                            <span className="adopter-stat-label">
                                {nextStep.icon ? (
                                    <span aria-hidden="true">{nextStep.icon}</span>
                                ) : (
                                    <img src={assets.icons.action} alt="" />
                                )}
                                {nextStep.label}
                            </span>

                            <strong className="adopter-stat-title">
                                {nextStep.title}
                            </strong>

                            <button
                                type="button"
                                className="adopter-stat-link"
                                onClick={() => setActiveAdopterPage(nextStep.page)}
                            >
                                {nextStep.linkText}
                            </button>
                        </article>

                        <article>
                            <span className="adopter-stat-label">
                                <img src={assets.icons.saved} alt="" />
                                Saved Pets
                            </span>

                            <strong>{savedPetsCount}</strong>

                            <button
                                type="button"
                                className="adopter-stat-link"
                                onClick={() => {
                                    setBrowseStartFilter("saved");
                                    setActiveAdopterPage("browse-pets");
                                }}
                            >
                                View your list
                            </button>
                        </article>

                        <article>
                            <span className="adopter-stat-label">
                                <img src={assets.icons.spark} alt="" />
                                New Matches
                            </span>

                            <strong>{hasTakenQuiz ? goodMatchesCount : "–"}</strong>

                            <button
                                type="button"
                                className="adopter-stat-link"
                                onClick={() =>
                                    setActiveAdopterPage(
                                        hasTakenQuiz ? "recommendations" : "matchmaking-quiz"
                                    )
                                }
                            >
                                {hasTakenQuiz ? "See who's new" : "Take the quiz first"}
                            </button>
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
                    initialStatusFilter={browseStartFilter}
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