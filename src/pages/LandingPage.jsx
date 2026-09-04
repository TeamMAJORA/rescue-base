import { useEffect, useState } from "react";
import assets from "../data/assets.json";
import PublicGISMap from "../components/system/PublicGISMap";

import "../styles/Landing.css"

import Header from "../components/landing/Header";
import PetSlider from "../components/landing/PetSlider";
import StatsBand from "../components/landing/StatsBand";
import AdoptionSteps from "../components/landing/AdoptionSteps";
import FeatureSection from "../components/landing/FeatureSection";
import CTAFooter from "../components/landing/CTAFooter";
import HeroSection from "../components/landing/HeroSection";
import RescueSection from "../components/landing/RescueSection";
import GISSection from "../components/landing/GISSection";
import DonorSection from "../components/landing/DonorSection";
import SpotlightSection from "../components/landing/SpotlightSection";
import TailsSection from "../components/landing/TailsSection";

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

            <HeroSection onSignup={onSignup} />

            <RescueSection pets={pets} onSignup={onSignup} />

            <GISSection />

            <DonorSection onSignup={onSignup}/>

            <StatsBand stats={stats} />

            <AdoptionSteps />

            <FeatureSection />

            <SpotlightSection 
                pet = {pets[0]}
                onSignup={onSignup}
            />

            <TailsSection onSignup={onSignup} />

            <CTAFooter />
        </main>
    );
}