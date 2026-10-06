import { formatPetStatus } from "../../utils/petStatus";

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

    return (
        <section className={className} id={id}>
            <div className="browse-pets-panel-heading">
                <div>
                    <h3>{title}</h3>
                    <p>{subtitle}</p>
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

                {!loading && !error && filteredPets.length === 0 && (
                    <div className="browse-pets-message">
                        <span>🐾</span>
                        <p>No available animals matched your search.</p>
                    </div>
                )}

                {!loading &&
                    !error &&
                    filteredPets.map((pet) => {
                        const isSelected = selectedId === pet._id;

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
                                            {formatPetStatus(pet.status)}
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
    );
}