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

export default function Dashboard({ onLogout, onLoginAgain, onOpenFoster }) {
    const savedUser = getSavedUser();

    // Signed out: login expired (server answered 401) or this account is not an adopter
    const savedRole = String(savedUser.role || "adopter").trim().toLowerCase();
    const isWrongRole = !["adopter", "foster"].includes(savedRole);
    const isFoster = savedRole === "foster";
    const [signedOut, setSignedOut] = useState(false);
    // Server is under maintenance for roles that are not allowed to log in (admins are let through by the server)
    const [maintenance, setMaintenance] = useState("");

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
    const [applicationHistory, setApplicationHistory] = useState([]);

    const [applicationError, setApplicationError] = useState("");

    const [notificationOpen, setNotificationOpen] =
        useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const activeApplicationStatuses = ["pending", "interview_scheduled", "interview_completed"];

    const hasPendingApplication =
     activeApplicationStatuses.includes(applicationStatus?.status);

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

    const draftApplication = (() => {
        try {
            const prefix = `rescuebase_adoption_draft_${savedUser.email || "guest"}_`;

            const drafts = Object.keys(localStorage)
                .filter((key) => key.startsWith(prefix))
                .map((key) => ({
                    petId: key.slice(prefix.length),
                    ...JSON.parse(localStorage.getItem(key) || "null"),
                }))
                .filter((draft) => draft.form)
                .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

            for (const draft of drafts) {
                const pet = pets.find(
                    (item) => item._id === draft.petId && item.status === "available"
                );

                if (!pet) continue;

                const form = draft.form;

                const steps = [
                    {
                        label: "Applicant",
                        done: Boolean(
                            form.fullName?.trim() &&
                            form.phone?.trim() &&
                            form.address?.trim() &&
                            (form.homeType !== "Other" || form.homeTypeOther?.trim())
                        ),
                    },
                    {
                        label: "Household",
                        done: Boolean(form.reason?.trim() && form.experience?.trim()),
                    },
                    {
                        label: "Documents",
                        done: Boolean(draft.document),
                    },
                ];

                const nextIndex = steps.findIndex((step) => !step.done);

                return { pet, steps, nextIndex };
            }

            return null;
        } catch {
            return null;
        }
    })();

    function getNextStep() {
        const petName = applicationStatus?.petName || "your pet";

        if (isApprovedApplication) {
            return {
                tone: "success",
                label: "Action Needed",
                icon: "/icons/approved.svg",
                title: `Meet ${petName}!`,
                linkText: "Check your interview schedule",
                page: "application-status",
            };
        }

        if (isRejectedApplication) {
            return {
                tone: "danger",
                label: "Action Needed",
                icon: "/icons/rejected.svg",
                title: "Find another match",
                linkText: "See your matches",
                page: hasTakenQuiz ? "recommendations" : "browse-pets",
            };
        }

        if (applicationStatus?.status === "interview_scheduled") {
            return {
                tone: "action",
                label: "Action Needed",
                icon: "/icons/Clock.svg",
                title: `Interview for ${petName}`,
                linkText: applicationStatus.interviewSchedule
                    ? new Date(applicationStatus.interviewSchedule).toLocaleString("en-PH", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                    })
                    : "See your schedule",
                page: "application-status",
            };
        }

        if (draftApplication && !hasPendingApplication) {
            const { pet, steps, nextIndex } = draftApplication;

            return {
                tone: "action",
                label: "Unfinished",
                icon: "/icons/Action.svg",
                title: `Finish applying for ${pet.name}`,
                linkText:
                    nextIndex === -1
                        ? "Ready to submit"
                        : `Step ${nextIndex + 1} of ${steps.length}: ${steps[nextIndex].label}`,
                page: "adoption-application",
                pet,
            };
        }

        if (!hasTakenQuiz) {
            return {
                tone: "action",
                label: "Action Needed",
                icon: "/icons/Action.svg",
                title: "Finish your match quiz",
                linkText: `${QUIZ_TOTAL_STEPS} quick steps`,
                page: "matchmaking-quiz",
            };
        }

        if (hasPendingApplication) {
            return {
                tone: "info",
                label: "In Review",
                icon: "/icons/in-review.svg",
                title: `Application for ${petName}`,
                linkText: "We'll notify you",
                page: "application-status",
            };
        }

        return {
            tone: "neutral",
            label: "All Set",
            icon: "/icons/done.svg",
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

async function fetchPets({ silent = false } = {}) {
    try {
        if (!silent) setPetsLoading(true);
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

            // Coming from the foster page's "Adopt" button: open the form for that pet
            let adoptPetId = null;

            try {
                adoptPetId = sessionStorage.getItem("rb_adopt_pet");
                sessionStorage.removeItem("rb_adopt_pet");
            } catch {
                adoptPetId = null;
            }

            if (adoptPetId) {
                const fosterPet = normalizedPets.find((pet) => pet._id === adoptPetId);

                if (fosterPet) {
                    handleApply(fosterPet);
                } else {
                    setPetsError("That pet is no longer available for adoption.");
                }
            }
            
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
                setSignedOut(true);
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
                setApplicationError(
                    data.message ||
                    "Failed to load application status."
                );

                return;
            }

            setApplicationError("");

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
                withdrawnAt: application.withdrawnAt || null,
                withdrawnFromStatus: application.withdrawnFromStatus || "",
                documentRequest: application.documentRequest || null,
            };

            setApplicationStatus(updatedStatus);

            if (activeApplicationStatuses.includes(updatedStatus.status)) {
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

            setApplicationError(
                "We couldn't reach the shelter's server."
            );
        } finally {
            setApplicationLoading(false);
        }
    }

    // Staff asked for a new ID: upload the image, then attach it to the application
    async function handleResubmitDocuments(file) {
        if (!applicationStatus?.applicationId) return;

        const uploadData = new FormData();
        uploadData.append("image", file);

        const uploadResponse = await fetch(`${API}/api/uploads/image`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: uploadData,
        });
        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadResult.success) {
            throw new Error(uploadResult.message || "Failed to upload your ID.");
        }

        const response = await fetch(
            `${API}/api/adoptions/${applicationStatus.applicationId}/documents`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    documents: [
                        {
                            documentName: file.name,
                            documentUrl: uploadResult.imageUrl,
                            publicId: uploadResult.publicId || "",
                        },
                    ],
                }),
            }
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to send your new ID.");
        }

        await fetchApplicationStatus();
    }

    async function handleWithdrawApplication(reason) {
        if (!applicationStatus?.applicationId) return;

        const response = await fetch(
            `${API}/api/adoptions/${applicationStatus.applicationId}/withdraw`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ reason }),
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to withdraw your application.");
        }

        await fetchApplicationStatus();
    }

    async function fetchApplicationHistory() {
        if (!token) return;

        try {
            const response = await fetch(
                `${API}/api/adoptions/user/history`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) return;

            setApplicationHistory(
                (data.applications || []).map((application) => ({
                    applicationId: application._id,
                    status: application.status || "pending",
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
                    submittedAt: application.createdAt,
                    updatedAt: application.updatedAt,
                    closedAt:
                        application.withdrawnAt ||
                        application.reviewedAt ||
                        application.updatedAt,
                    note:
                        application.status === "rejected"
                            ? application.rejectionReason
                            : application.status === "withdrawn"
                                ? application.withdrawalReason
                                : "",
                }))
            );
        } catch (error) {
            console.error("Fetch application history error:", error);
        }
    }

    useEffect(() => {
        fetchApplicationHistory();
    }, [applicationStatus?.applicationId, applicationStatus?.status]);

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
        localStorage.removeItem("token");

        localStorage.removeItem(
            "rescuebase_user"
        );

        localStorage.removeItem(
            "rescuebase_pending_application"
        );
        
        localStorage.removeItem("token");
        
        Object.keys(localStorage)
        .filter((key) => key.startsWith("rescuebase_adoption_draft_"))
        .forEach((key) => localStorage.removeItem(key));

        onLogout?.();
    }

    function handleLoginAgain() {
        localStorage.removeItem("token");
        localStorage.removeItem("rescuebase_user");
        localStorage.removeItem("rescuebase_pending_application");

        if (onLoginAgain) {
            onLoginAgain();
        } else {
            onLogout?.();
        }
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
                                <li className="adopter-hero-time">
                                    <img src="/icons/Clock.svg" alt="" />
                                    ~2 min
                                </li>
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
                                {nextStep.icon.startsWith("/") ? (
                                    <img src={nextStep.icon} alt="" />
                                ) : (
                                    <span aria-hidden="true">{nextStep.icon}</span>
                                )}
                                {nextStep.label}
                            </span>

                            <strong className="adopter-stat-title">
                                {nextStep.title}
                            </strong>

                            <button
                                type="button"
                                className="adopter-stat-link"
                                onClick={() =>
                                    nextStep.pet
                                        ? handleApply(nextStep.pet)
                                        : setActiveAdopterPage(nextStep.page)
                                }
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
                    error={applicationError}
                    onRefresh={fetchApplicationStatus}
                    onWithdraw={handleWithdrawApplication}
                    onResubmitDocuments={handleResubmitDocuments}
                    history={applicationHistory}
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
                    onBrowsePets={() => setActiveAdopterPage("browse-pets")}
                    onViewPet={(pet) => {
                        setSelectedPet(pet);
                        setActiveAdopterPage("browse-pets");
                    }}
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

    // Any API call that comes back 401 means the login ran out -> show the signed-out card
    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            const url = String(args[0]?.url || args[0] || "");

            if (response.status === 401 && API && url.startsWith(API)) {
                //deactivated accounts are marked by the server so we can show the right screen
                let disabled = false;
                try {
                    disabled = Boolean((await response.clone().json())?.accountDisabled);
                } catch {
                    // not a JSON answer
                }
                setSignedOut((current) => (current === "disabled" || disabled ? "disabled" : true));
            }
            // 503 + maintenance flag: show the maintenance screen (admins are let through by the server)
            if (response.status === 503 && API && url.startsWith(API)) {
                try {
                    const body = await response.clone().json();
                    if (body?.maintenance) {
                        setMaintenance(body.message || "RescueBase is under maintenance.");
                    }
                } catch {
                    // not a JSON answer
                }
            }

            return response;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    useEffect(() => {
        if (isWrongRole || signedOut) {
            return;
        }

        refreshDashboard();
        loadNotifications();

        const interval = setInterval(() => {
            fetchApplicationStatus();
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [savedEmail, signedOut]);

    // Keep pet availability fresh
    useEffect(() => {
        if (applicationStatus?.status === "approved") {
            fetchPets({ silent: true });
        }
    }, [applicationStatus?.status]);
    
    useEffect(() => {
        fetchPets({ silent: true });
    }, [activeAdopterPage]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchPets({ silent: true });
        }, 30000);

        return () => clearInterval(interval);
    }, []);
    
    // Account was deactivated by an admin
    if (signedOut === "disabled") {
        return (
            <main className="adopter-signed-out">
                <section className="adopter-signed-out-card">
                    <div className="adopter-signed-out-icon is-blocked">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M5.6 5.6l12.8 12.8" />
                        </svg>
                    </div>
                    <h2>Your account has been deactivated</h2>
                    <p>An admin turned off this account, so you've been signed out.</p>
                    <p className="adopter-signed-out-note">
                        Think this is a mistake? Please contact the shelter staff.
                    </p>
                    <button type="button" onClick={handleLoginAgain}>
                        Back to home
                    </button>
                </section>
            </main>
        );
    }

    if (maintenance && !signedOut && !isWrongRole) {
        return (
            <main className="adopter-signed-out">
                <section className="adopter-signed-out-card">
                    <div className="adopter-signed-out-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />
                        </svg>
                    </div>
                    <h2>We'll be right back</h2>
                    <p>{maintenance}</p>
                    <button type="button" onClick={() => window.location.reload()}>
                        Check again
                    </button>
                    <button type="button" className="adopter-signed-out-link" onClick={handleLoginAgain}>
                        Log out
                    </button>
                </section>
            </main>
        );
    }

    if (signedOut || isWrongRole) {
        return (
            <main className="adopter-signed-out">
                <section className="adopter-signed-out-card">
                    <div className="adopter-signed-out-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <path d="M16 17l5-5-5-5M21 12H9" />
                        </svg>
                    </div>

                    <h2>You've been signed out</h2>

                    <p>Please log in again to continue.</p>

                    <button type="button" onClick={handleLoginAgain}>
                        Log in again
                    </button>
                </section>
            </main>
        );
    }



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

                    <span>
                        RescueBase
                        {isFoster && <small>Adopter view</small>}
                    </span>
                </button>

                <nav className="adopter-menu">
                    {adopterMenu
                        .filter((item) => !(isFoster && item.key === "role-application"))
                        .map((item) => {
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

                    {isFoster && (
                        <div className="adopter-menu-group">
                            <button
                                type="button"
                                title="Foster Dashboard"
                                className="adopter-menu-switch"
                                onClick={() => onOpenFoster?.()}
                            >
                                <div className="adopter-menu-text">
                                    <img
                                        className="adopter-menu-icon icon-default"
                                        src={ICON_PATH + "return-brown.svg"}
                                        alt=""
                                        aria-hidden="true"
                                    />
                                    <img
                                        className="adopter-menu-icon icon-active"
                                        src={ICON_PATH + "return-light.svg"}
                                        alt=""
                                        aria-hidden="true"
                                    />
                                    <strong>Back to Foster Dashboard</strong>
                                </div>
                            </button>
                        </div>
                    )}
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