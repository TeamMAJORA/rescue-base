import { useEffect, useState } from "react";
import assets from "../data/assets.json";
import PublicGISMap from "../components/system/PublicGISMap";

import Header from "../components/landing/Header";
import PetSlider from "../components/landing/PetSlider";
import StatsBand from "../components/landing/StatsBand";
import AdoptionSteps from "../components/landing/AdoptionSteps";
import FeatureSection from "../components/landing/FeatureSection";
import CTAFooter from "../components/landing/CTAFooter";

const API = import.meta.env.VITE_BACKEND_URL;

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

function formatPetForCard(animal) {
    const ageLabel = animal.age
        ? animal.age + (animal.age === 1 ? " year" : " years")
        : "Age unknown";

    const hasRealImage =
        typeof animal.image === "string" &&
        animal.image.trim().length > 0;

    return {
        id: animal._id,
        name: animal.name,
        breed: animal.breed || animal.type || "Mixed",
        age: ageLabel,
        tag: animal.type || "Pet",
        image: hasRealImage
            ? animal.image
            : assets.images.authPets,
    };
}

export default function LandingPage({
    onLogin,
    onSignup,
}) {
    const [pets, setPets] = useState([]);

    const [stats, setStats] = useState([
        { value: "—", label: "Pets Adopted" },
        { value: "—", label: "Pets Available" },
        { value: "—", label: "Active Foster Caregivers" },
        { value: "—", label: "Total Rescues" },
    ]);

    useEffect(() => {
        if (!API) {
            return;
        }

        let cancelled = false;

        async function loadLandingData() {
            try {
                const [
                    animalsRes,
                    fosterRes,
                ] = await Promise.all([
                    fetch(API + "/api/animals"),
                    fetch(API + "/api/foster/assignments"),
                ]);

                const animalsData =
                    await animalsRes.json();

                const fosterData =
                    await fosterRes.json();

                if (cancelled) {
                    return;
                }

                const animals =
                    animalsData.success
                        ? animalsData.animals
                        : [];

                const assignments =
                    fosterData.success
                        ? fosterData.assignments
                        : [];

                const available =
                    animals.filter(
                        (animal) =>
                            animal.availabilityStatus ===
                            "available"
                    );

                const adoptedCount =
                    animals.filter(
                        (animal) =>
                            animal.adoptionStatus ===
                            "adopted"
                    ).length;

                const activeFosterCount =
                    assignments.filter(
                        (assignment) =>
                            assignment.status ===
                            "active"
                    ).length;

                setPets(
                    available
                        .slice(0, 8)
                        .map(formatPetForCard)
                );

                setStats([
                    {
                        value: String(adoptedCount),
                        label: "Pets Adopted",
                    },
                    {
                        value: String(available.length),
                        label: "Pets Available",
                    },
                    {
                        value: String(activeFosterCount),
                        label: "Active Foster Caregivers",
                    },
                    {
                        value: String(animals.length),
                        label: "Total Rescues",
                    },
                ]);
            } catch (error) {
                console.error(
                    "Failed to load landing page data:",
                    error
                );
            }
        }

        loadLandingData();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <main className="app">
            <Header
                onLogin={onLogin}
                onSignup={onSignup}
            />

            <img
                className="page-paws"
                src={assets.images.pawTrail}
                alt=""
                aria-hidden="true"
            />

            <img
                className="page-paws-bottom"
                src={assets.images.pawTrail}
                alt=""
                aria-hidden="true"
            />

            <img
                className="page-paws-footer"
                src={assets.images.pawTrail}
                alt=""
                aria-hidden="true"
            />

            <section className="hero">
                <div className="hero-content">
                    <h1>
                        Find Your <br />
                        Perfect <span>Match</span>
                    </h1>

                    <p>
                        Helping every rescued pet find a loving family faster.
                    </p>

                    <button
                        className="match-btn"
                        type="button"
                        onClick={onSignup}
                    >
                        Find my Match
                        <img
                            src={assets.icons.heart}
                            alt=""
                        />
                    </button>
                </div>
            </section>

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
                    pets={
                        pets.length > 0
                            ? pets
                            : samplePets
                    }
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
                        Donate
                        <img
                            src={assets.icons.donate}
                            alt=""
                        />
                    </button>
                </div>
            </section>

            <StatsBand stats={stats} />

            <AdoptionSteps />

            <PublicGISMap />

            <FeatureSection />

            <CTAFooter />
        </main>
    );
}