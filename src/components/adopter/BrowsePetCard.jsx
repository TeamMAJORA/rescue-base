import { formatPetStatus } from "../../utils/petStatus";
import PetTypeIcon from "../system/PetTypeIcon";

// One pet card: the adopter's Browse Pets list and the landing page carousel.
// `children` go on the photo (the adopter list puts its save heart there).
export default function BrowsePetCard({
    pet,
    className = "",
    viewLabel = "View Full Profile",
    onClick,
    onView,
    children,
}) {
    return (
        <article className={`browse-pet-card ${className}`.trim()} onClick={onClick}>
            <div className="browse-pet-card-image">
                {pet.image ? (
                    <img src={pet.image} alt={pet.name} />
                ) : (
                    <span><PetTypeIcon type={pet.petType} /></span>
                )}

                <span className={`adopter-status ${pet.status || "not_available"}`}>
                    {formatPetStatus(pet.status)}
                </span>

                {children}
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
                        onView(pet);
                    }}
                >
                    {viewLabel}
                </button>
            </div>
        </article>
    );
}
