import assets from "../../data/assets.json";
import PetTypeIcon from "../system/PetTypeIcon";
import { goToSection } from "./goToSection";

export default function SpotlightSection({ pet, onOpenPet, onSignup }) {
    const meta = [pet.breed || pet.type, pet.gender, pet.age, pet.location].filter(Boolean);

    return (
        <section className="spotlight-section">
            <div className="spotlight-heading">
                <h2>Meet This Week’s Spotlight Star!</h2>
                <p>
                    Get to know the personality behind the paws — there’s so much more to
                    <br />
                    love than just a picture!
                </p>
            </div>

            <div className="spotlight-card">
                <div className="spotlight-image-wrap">
                    {pet.image ? (
                        <img className="spotlight-image" src={pet.image} alt={pet.name} />
                    ) : (
                        <span className="spotlight-image spotlight-image-placeholder">
                            <PetTypeIcon type={pet.petType} />
                        </span>
                    )}
                    <span className="spotlight-status">Available</span>
                </div>

                <div className="spotlight-details">
                    <h3>{pet.name}</h3>
                    <span className="spotlight-meta">{meta.join(" • ")}</span>

                    {pet.personalityTags.length > 0 && (
                        <div className="spotlight-tags">
                            {pet.personalityTags.map((tag) => (
                                <span key={tag}>{tag}</span>
                            ))}
                        </div>
                    )}

                    <p className="spotlight-description">{pet.story}</p>

                    <div className="spotlight-actions">
                        <button className="spotlight-adopt-btn" type="button" onClick={() => onOpenPet(pet)}>
                            See {pet.name}’s Profile
                            <img src={assets.icons.adopt} alt="" />
                        </button>
                        <button className="spotlight-outline-btn" type="button" onClick={onSignup}>
                            Foster
                            <img src={assets.icons.home} alt="" />
                        </button>
                        <button
                            className="spotlight-outline-btn"
                            type="button"
                            onClick={() => goToSection("help", onSignup)}
                        >
                            Donate
                            <img src={assets.icons.donate} alt="" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
