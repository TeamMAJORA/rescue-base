import { formatPetStatus } from "../../utils/petStatus";

export default function PetDetailPanel({
    className = "",
    pet,
    hasPendingApplication,
    applicationStatus,
    onApply,
}) {
    const currentPet = pet || {};

    return (
        <aside className={className}>
            {!currentPet._id ? (
                <div className="browse-pet-empty-details">
                    <span>🐾</span>
                    <h3>No animal selected</h3>
                    <p>Select an available animal from the list to view its profile.</p>
                </div>
            ) : (
                <>
                    <div className="browse-pet-main-image">
                        {currentPet.image ? (
                            <img src={currentPet.image} alt={currentPet.name} />
                        ) : (
                            <span>{currentPet.icon || "🐾"}</span>
                        )}
                    </div>

                    <div className="browse-pet-title">
                        <span className={`adopter-status ${currentPet.status || "not_available"}`}>
                            {formatPetStatus(currentPet.status)}
                        </span>
                        <h2>{currentPet.name}</h2>
                            <p>
                                {[currentPet.type || "Pet", currentPet.breed || "Unknown breed", currentPet.color]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </p>
                    </div>

                    <div className="browse-pet-details-grid">
                        <article>
                            <span>Age</span>
                            <strong>{currentPet.age || "Unknown"}</strong>
                        </article>
                        <article>
                            <span>Gender</span>
                            <strong>{currentPet.gender || "Unknown"}</strong>
                        </article>
                        <article>
                            <span>Size</span>
                            <strong>{currentPet.size || "Unknown"}</strong>
                        </article>
                        <article>
                            <span>Location</span>
                            <strong>{currentPet.location || "RescueBase Shelter"}</strong>
                        </article>
                    </div>

                    <section className="browse-pet-information">
                        <h3>Personality</h3>
                        {currentPet.personalityTags?.length > 0 && (
                            <div className="browse-pet-tags">
                                {currentPet.personalityTags.map((tag) => (
                                    <span key={tag}>{tag}</span>
                                ))}
                            </div>
                        )}
                        <p>{currentPet.personality || "Behavior information has not been added yet."}</p>
                    </section>

                    <section className="browse-pet-information">
                        <h3>Ideal Home</h3>
                        <p>{currentPet.idealHome || "Contact the shelter for additional information."}</p>
                    </section>

                    <section className="browse-pet-information">
                        <h3>Health Status</h3>
                        <p>{currentPet.health || "Health information is not available."}</p>
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
                        disabled={currentPet.status !== "available" || hasPendingApplication}
                    >
                        {hasPendingApplication
                            ? `Pending application for ${applicationStatus?.petName || "another animal"}`
                            : currentPet.status === "available"
                                ? `Apply to Adopt ${currentPet.name}`
                                : "Currently Not Available"}
                    </button>
                </>
            )}
        </aside>
    );
}