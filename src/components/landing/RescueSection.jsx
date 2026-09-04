import assets from "../../data/assets.json";
import PetSlider from "../landing/PetSlider";

const samplePets = [
    {
        name: "Max",
        breed: "Shih Tzu",
        age: "4 years",
        tag: "Kid Friendly",
        image: assets.images.authPets,
    },
    {
        name: "Blacky",
        breed: "Aspin",
        age: "1 year",
        tag: "Kid Friendly",
        image: assets.images.authPets2,
    },
    {
        name: "Chichay",
        breed: "Puspin",
        age: "4 years",
        tag: "Kid Friendly",
        image: assets.images.authPets,
    },
    {
        name: "Biscuit",
        breed: "Labrador Mix",
        age: "2 years",
        tag: "Good with Dogs",
        image: assets.images.photo1,
    },
    {
        name: "Mocha",
        breed: "Puspin",
        age: "8 months",
        tag: "Playful",
        image: assets.images.photo2,
    },
    {
        name: "Snowy",
        breed: "Aspin",
        age: "3 years",
        tag: "Calm & Gentle",
        image: assets.images.photo3,
    },
];

export default function RescueSection({ pets, onSignup }) {
    const displayPets = pets.length > 0 ? pets : samplePets;

    return (
        <section
            className="pets-section"
            id="pets"
        >
            <div className="section-heading">
                <h2>
                    Meet some of our rescues
                </h2>

                <p>
                    Every one of them is waiting for you.
                </p>
            </div>

            <a
                className="see-all-pets"
                href="#pets"
                onClick={(e) => {
                    e.preventDefault();
                    onSignup();
                }}
            >
                See All Pets →
            </a>

            <PetSlider
                pets={displayPets}
            />

            <p className="pet-note">
                Sign in to see all available pets and start your application
            </p>

            <div className="pet-actions">
                <button
                    className="adopt-btn"
                    type="button"
                    onClick={onSignup}
                >
                    Adopt
                    <img
                        src={assets.icons.adopt}
                        alt=""
                    />
                </button>

                <button
                    className="donate-btn"
                    type="button"
                    onClick={onSignup}
                >
                    Volunteer
                    <img
                        src={assets.icons.donate}
                        alt=""
                    />
                </button>
            </div>
        </section>
    );
}