function formatStatus(status) {
    return String(status || "not_available").replaceAll("_", " ");
}

export default function BrowsePets({
    pets,
    loading,
    error,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    filteredPets,
    selectedPet,
    setSelectedPet,
    hasPendingApplication,
    applicationStatus,
    onApply,
    onRefresh,
}) {
    const currentPet = selectedPet || {};

    return (
        <section className="browse-pets-module">
            <header className="browse-pets-header">
                <div>
                    <span>Animal Profiles</span>

                    <h2>Browse Available Pets</h2>

                    <p>
                        Select an animal to view its complete profile and
                        begin an adoption application.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => onRefresh?.()}
                    disabled={loading}
                >
                    {loading ? "Refreshing..." : "Refresh Pets"}
                </button>
            </header>

            {hasPendingApplication && (
                <section className="browse-pets-pending-banner">
                    <div>
                        <span>Pending Application</span>

                        <h3>
                            You already applied for{" "}
                            {applicationStatus?.petName || "an animal"}
                        </h3>

                        <p>
                            You can continue browsing, but another application
                            cannot be submitted until the shelter finishes its
                            review.
                        </p>
                    </div>

                    {applicationStatus?.petImage && (
                        <img
                            src={applicationStatus.petImage}
                            alt={applicationStatus.petName || "Applied animal"}
                        />
                    )}
                </section>
            )}

            <div className="browse-pets-layout">
                <section className="browse-pets-list-panel">
                    <div className="browse-pets-panel-heading">
                        <div>
                            <h3>Available Animals</h3>

                            <p>
                                {loading
                                    ? "Loading animals..."
                                    : `${pets.length} animal${pets.length === 1 ? "" : "s"
                                    } currently available`}
                            </p>
                        </div>
                    </div>

                    <div className="browse-pets-filters">
                        <label>
                            Search Pets

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search by name, breed, or type"
                            />
                        </label>

                        <label>
                            Animal Type

                            <select
                                value={typeFilter}
                                onChange={(event) =>
                                    setTypeFilter(event.target.value)
                                }
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

                                <button
                                    type="button"
                                    onClick={() => onRefresh?.()}
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {!loading &&
                            !error &&
                            filteredPets.length === 0 && (
                                <div className="browse-pets-message">
                                    <span>🐾</span>

                                    <p>
                                        No available animals matched your
                                        search.
                                    </p>
                                </div>
                            )}

                        {!loading &&
                            !error &&
                            filteredPets.map((pet) => {
                                const isSelected =
                                    currentPet._id === pet._id;

                                return (
                                    <article
                                        key={pet._id}
                                        className={
                                            isSelected
                                                ? "browse-pet-card active"
                                                : "browse-pet-card"
                                        }
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedPet(pet)}
                                        onKeyDown={(event) => {
                                            if (
                                                event.key === "Enter" ||
                                                event.key === " "
                                            ) {
                                                setSelectedPet(pet);
                                            }
                                        }}
                                    >
                                        <div className="browse-pet-card-image">
                                            {pet.image ? (
                                                <img
                                                    src={pet.image}
                                                    alt={pet.name}
                                                />
                                            ) : (
                                                <span>{pet.icon || "🐾"}</span>
                                            )}
                                        </div>

                                        <div className="browse-pet-card-content">
                                            <div>
                                                <h3>{pet.name}</h3>

                                                <span
                                                    className={`adopter-status ${pet.status ||
                                                        "not_available"
                                                        }`}
                                                >
                                                    {formatStatus(pet.status)}
                                                </span>
                                            </div>

                                            <p>
                                                {pet.type || "Pet"} •{" "}
                                                {pet.breed || "Unknown breed"}
                                            </p>

                                            <small>
                                                {pet.age || "Unknown age"} •{" "}
                                                {pet.gender || "Unknown"} •{" "}
                                                {pet.size || "Unknown size"}
                                            </small>
                                        </div>

                                        <span className="browse-pet-card-arrow">
                                            →
                                        </span>
                                    </article>
                                );
                            })}
                    </div>
                </section>

                <aside className="browse-pet-details-panel">
                    {!currentPet._id ? (
                        <div className="browse-pet-empty-details">
                            <span>🐾</span>

                            <h3>No animal selected</h3>

                            <p>
                                Select an available animal from the list to view
                                its profile.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="browse-pet-main-image">
                                {currentPet.image ? (
                                    <img
                                        src={currentPet.image}
                                        alt={currentPet.name}
                                    />
                                ) : (
                                    <span>{currentPet.icon || "🐾"}</span>
                                )}
                            </div>

                            <div className="browse-pet-title">
                                <span
                                    className={`adopter-status ${currentPet.status || "not_available"
                                        }`}
                                >
                                    {formatStatus(currentPet.status)}
                                </span>

                                <h2>{currentPet.name}</h2>

                                <p>
                                    {currentPet.type || "Pet"} •{" "}
                                    {currentPet.breed || "Unknown breed"}
                                </p>
                            </div>

                            <div className="browse-pet-details-grid">
                                <article>
                                    <span>Age</span>
                                    <strong>
                                        {currentPet.age || "Unknown"}
                                    </strong>
                                </article>

                                <article>
                                    <span>Gender</span>
                                    <strong>
                                        {currentPet.gender || "Unknown"}
                                    </strong>
                                </article>

                                <article>
                                    <span>Size</span>
                                    <strong>
                                        {currentPet.size || "Unknown"}
                                    </strong>
                                </article>

                                <article>
                                    <span>Location</span>
                                    <strong>
                                        {currentPet.location ||
                                            "RescueBase Shelter"}
                                    </strong>
                                </article>
                            </div>

                            <section className="browse-pet-information">
                                <h3>Personality</h3>

                                <p>
                                    {currentPet.personality ||
                                        "Behavior information has not been added yet."}
                                </p>
                            </section>

                            <section className="browse-pet-information">
                                <h3>Ideal Home</h3>

                                <p>
                                    {currentPet.idealHome ||
                                        "Contact the shelter for additional information."}
                                </p>
                            </section>

                            <section className="browse-pet-information">
                                <h3>Health Status</h3>

                                <p>
                                    {currentPet.health ||
                                        "Health information is not available."}
                                </p>
                            </section>

                            <section className="browse-pet-information">
                                <h3>Rescue Story</h3>

                                <p>
                                    {currentPet.story ||
                                        `${currentPet.name} is currently under the care of RescueBase.`}
                                </p>
                            </section>

                            <button
                                type="button"
                                className="browse-pet-apply-button"
                                onClick={() => onApply?.(currentPet)}
                                disabled={
                                    currentPet.status !== "available" ||
                                    hasPendingApplication
                                }
                            >
                                {hasPendingApplication
                                    ? `Pending application for ${applicationStatus?.petName ||
                                    "another animal"
                                    }`
                                    : currentPet.status === "available"
                                        ? `Apply to Adopt ${currentPet.name}`
                                        : "Currently Not Available"}
                            </button>
                        </>
                    )}
                </aside>
            </div>
        </section>
    );
}