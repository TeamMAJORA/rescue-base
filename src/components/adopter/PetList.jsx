import { useMemo, useState } from "react";
import { formatPetStatus } from "../../utils/petStatus";

const STATUS_PILLS = [
    { key: "all", label: "All Pets" },
    { key: "available", label: "Available" },
    { key: "in_foster", label: "In Foster" },
    { key: "saved", label: "♥ Saved" },
];

const SAVED_KEY = "rescuebase_saved_pets";

function readSavedPets() {
    try {
        return JSON.parse(localStorage.getItem(SAVED_KEY)) || [];
    } catch {
        return [];
    }
}

function getSortTime(pet) {
    const time = new Date(pet.createdAt || pet.intakeDate || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
}

export default function PetList({
    className = "",
    id,
    title = "Who's Stealing Your Heart Today?",
    subtitle = "Pick a pal below to peek at their story and apply today.",
    loading,
    error,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    filteredPets = [],
    selectedPet,
    setSelectedPet,
    onRefresh,
}) {
    const selectedId = selectedPet?._id;

    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [savedIds, setSavedIds] = useState(readSavedPets);

    function toggleSaved(petId) {
        setSavedIds((previous) => {
            const next = previous.includes(petId)
                ? previous.filter((savedId) => savedId !== petId)
                : [...previous, petId];

            try {
                localStorage.setItem(SAVED_KEY, JSON.stringify(next));
            } catch {
                // storage unavailable — keep it in memory only
            }

            return next;
        });
    }

    const visiblePets = useMemo(() => {
        const list = filteredPets.filter((pet) => {
            if (statusFilter === "available") return pet.fosterStatus !== "in_foster";
            if (statusFilter === "in_foster") return pet.fosterStatus === "in_foster";
            if (statusFilter === "saved") return savedIds.includes(pet._id);
            return true;
        });

        return [...list].sort((a, b) => {
            if (sortBy === "name") return String(a.name || "").localeCompare(String(b.name || ""));
            if (sortBy === "oldest") return getSortTime(a) - getSortTime(b);
            return getSortTime(b) - getSortTime(a);
        });
    }, [filteredPets, statusFilter, sortBy, savedIds]);

    return (
        <section className={className} id={id}>
            <div className="browse-pets-panel-heading">
                <div>
                    <h3>{title}</h3>
                    <p>{subtitle}</p>
                </div>
            </div>

            <div className="pet-list-toolbar">
                <input
                    type="search"
                    className="pet-list-search"
                    aria-label="Search pets"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search pet name, breed, or type"
                />

                <select
                    className="pet-list-select"
                    aria-label="Species"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                >
                    <option value="all">Species: All</option>
                    <option value="dog">Species: Dogs</option>
                    <option value="cat">Species: Cats</option>
                </select>

                <select
                    className="pet-list-select"
                    aria-label="Sort pets"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                >
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="name">Sort: Name A–Z</option>
                </select>
            </div>

            <div className="pet-list-pills-row">
                <div className="pet-list-pills" role="group" aria-label="Filter pets">
                    {STATUS_PILLS.map((pill) => (
                        <button
                            key={pill.key}
                            type="button"
                            className={statusFilter === pill.key ? "active" : ""}
                            aria-pressed={statusFilter === pill.key}
                            onClick={() => setStatusFilter(pill.key)}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>

                {!loading && !error && (
                    <span className="pet-list-count">
                        {visiblePets.length} {visiblePets.length === 1 ? "pet" : "pets"}
                    </span>
                )}
            </div>

            <div className="browse-pets-list">
                {loading && (
                    <div className="browse-pets-message">
                        <span>🐾</span>
                        <p>Loading available pets...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="browse-pets-message error">
                        <span>!</span>
                        <p>{error}</p>
                        <button type="button" onClick={() => onRefresh?.()}>
                            Try Again
                        </button>
                    </div>
                )}

                {!loading && !error && visiblePets.length === 0 && (
                    <div className="browse-pets-message">
                        <span>{statusFilter === "saved" ? "♡" : "🐾"}</span>
                        <p>
                            {statusFilter === "saved"
                                ? "You haven't saved any pets yet. Tap the heart on a pet to save it."
                                : "No available animals matched your search."}
                        </p>
                    </div>
                )}

                {!loading &&
                    !error &&
                    visiblePets.map((pet) => {
                        const isSelected = selectedId === pet._id;
                        const isSaved = savedIds.includes(pet._id);

                        return (
                            <article
                                key={pet._id}
                                className={isSelected ? "browse-pet-card active" : "browse-pet-card"}
                                onClick={() => setSelectedPet(pet)}
                            >
                                <div className="browse-pet-card-image">
                                    {pet.image ? (
                                        <img src={pet.image} alt={pet.name} />
                                    ) : (
                                        <span>{pet.icon || "🐾"}</span>
                                    )}

                                    <span className={`adopter-status ${pet.status || "not_available"}`}>
                                        {formatPetStatus(pet.status)}
                                    </span>

                                    <button
                                        type="button"
                                        className={`pet-card-save${isSaved ? " saved" : ""}`}
                                        aria-pressed={isSaved}
                                        aria-label={isSaved ? `Remove ${pet.name} from saved` : `Save ${pet.name}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            toggleSaved(pet._id);
                                        }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                            <path
                                                d="M12 20.5s-7.5-4.6-7.5-10.1A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z"
                                                fill={isSaved ? "currentColor" : "none"}
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                <div className="browse-pet-card-content">
                                    <h3>{pet.name}</h3>
                                    <p>
                                        {pet.type || "Pet"} · {pet.breed || "Unknown breed"}
                                    </p>

                                    <div className="browse-pet-card-stats">
                                        <div>
                                            <span>Age</span>
                                            <strong>{pet.age || "Unknown"}</strong>
                                        </div>
                                        <div>
                                            <span>Gender</span>
                                            <strong>{pet.gender || "Unknown"}</strong>
                                        </div>
                                        <div>
                                            <span>Size</span>
                                            <strong>{pet.size || "Unknown"}</strong>
                                        </div>
                                    </div>

                                    <small className="browse-pet-card-location">
                                        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                                            <path
                                                d="M12 21s-6.5-6.1-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.9-6.5 11-6.5 11z"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            />
                                            <circle cx="12" cy="10" r="2.3" fill="none" stroke="currentColor" strokeWidth="2" />
                                        </svg>
                                        {pet.location || "RescueBase Shelter"}
                                    </small>

                                    <button
                                        type="button"
                                        className="browse-pet-card-view"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setSelectedPet(pet);
                                        }}
                                    >
                                        {isSelected ? "Viewing Profile" : "View Full Profile"}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
            </div>
        </section>
    );
}