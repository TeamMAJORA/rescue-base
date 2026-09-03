export default function PetCard({ pet }) {
    return (
        <article className="pet-card">
            <img className="pet-image" src={pet.image} alt={pet.name} />

            <div className="pet-details">
                <h3>{pet.name}</h3>
                <p>{pet.breed}</p>
                <p>{pet.age}</p>
                <span>{pet.tag}</span>
            </div>
        </article>
    );
}