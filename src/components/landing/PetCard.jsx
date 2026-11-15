import PetTypeIcon from "../system/PetTypeIcon";

export default function PetCard({ pet, onOpen }) {
    const tag = pet.personalityTags?.[0] || pet.type || "Pet";

    return (
        <button type="button" className="pet-card" onClick={() => onOpen(pet)}>
            {pet.image ? (
                <img className="pet-image" src={pet.image} alt={pet.name} />
            ) : (
                <span className="pet-image pet-image-placeholder">
                    <PetTypeIcon type={pet.petType} />
                </span>
            )}

            <div className="pet-details">
                <h3>{pet.name}</h3>
                <p>{pet.breed || pet.type || "Mixed"}</p>
                <p>{pet.age}</p>
                <span>{tag}</span>
                <strong className="pet-card-meet">Meet {pet.name} →</strong>
            </div>
        </button>
    );
}
