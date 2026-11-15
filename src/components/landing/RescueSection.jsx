import { useState } from "react";
import PetSlider from "./PetSlider";
import PetCard from "./PetCard";

const SLIDER_PET_COUNT = 8;

export default function RescueSection({ pets, onOpenPet }) {
    const [showAll, setShowAll] = useState(false);

    return (
        <section className="pets-section" id="pets">
            <div className="section-heading">
                <h2>Meet some of our rescues</h2>
                <p>Every one of them is waiting for you.</p>
            </div>

            {pets.length === 0 ? (
                <p className="pet-empty">
                    Our adoptable pets will show here soon. Please check back in a little while.
                </p>
            ) : (
                <>
                    {pets.length > SLIDER_PET_COUNT && (
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
                                <PetCard key={pet.id} pet={pet} onOpen={onOpenPet} />
                            ))}
                        </div>
                    ) : (
                        <PetSlider pets={pets.slice(0, SLIDER_PET_COUNT)} onOpenPet={onOpenPet} />
                    )}

                    <p className="pet-note">
                        Tap a pet to see their full profile. You only need an account when you're ready to apply.
                    </p>
                </>
            )}
        </section>
    );
}
