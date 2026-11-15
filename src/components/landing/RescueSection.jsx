import { useState } from "react";
import PetCarousel from "./PetCarousel";
import BrowsePetCard from "../adopter/BrowsePetCard";

const CAROUSEL_PET_COUNT = 8;

export default function RescueSection({ pets, isLoading, onOpenPet, onSignup }) {
    const [showAll, setShowAll] = useState(false);

    return (
        <section className="pets-section" id="pets">
            <div className="section-heading">
                <h2>Meet some of our rescues</h2>
                <p>Every one of them is waiting for you.</p>
            </div>

            {isLoading ? (
                <p className="pet-empty pet-loading" role="status">
                    <span className="pet-loading-spinner" aria-hidden="true" />
                    Finding pets for you…
                </p>
            ) : pets.length === 0 ? (
                <div className="pet-empty">
                    <p>Our adoptable pets will show here soon.</p>
                    {/* New sign-ups are adopter accounts, and adopters get a notification for every new pet */}
                    <button type="button" className="pet-empty-action" onClick={onSignup}>
                        Get notified when new pets arrive →
                    </button>
                </div>
            ) : (
                <>
                    {pets.length > CAROUSEL_PET_COUNT && (
                        <button
                            type="button"
                            className="see-all-pets"
                            onClick={() => setShowAll((current) => !current)}
                        >
                            {showAll ? "Show fewer" : `See all ${pets.length} pets →`}
                        </button>
                    )}

                    {showAll ? (
                        <div className="pet-grid">
                            {pets.map((pet) => (
                                <BrowsePetCard
                                    key={pet.id}
                                    pet={pet}
                                    onClick={() => onOpenPet(pet)}
                                    onView={onOpenPet}
                                />
                            ))}
                        </div>
                    ) : (
                        <PetCarousel pets={pets.slice(0, CAROUSEL_PET_COUNT)} onOpenPet={onOpenPet} />
                    )}

                    <p className="pet-note">
                        Tap a pet to see their full profile. You only need an account when you're ready to apply.
                    </p>
                </>
            )}
        </section>
    );
}
