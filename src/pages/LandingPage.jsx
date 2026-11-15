import { useEffect, useState } from "react";
import assets from "../data/assets.json";
import { toPetProfile } from "../utils/petProfile";

import "../styles/Landing.css";
import "../styles/adopter/BrowsePets.css";

import Header from "../components/landing/Header";
import HeroSection from "../components/landing/HeroSection";
import RescueSection from "../components/landing/RescueSection";
import StatsBand from "../components/landing/StatsBand";
import AdoptionSteps from "../components/landing/AdoptionSteps";
import NeedsSection from "../components/landing/NeedsSection";
import FeatureSection from "../components/landing/FeatureSection";
import GISSection from "../components/landing/GISSection";
import HeartsCodeSection from "../components/landing/HeartsCodeSection";
import TailsSection from "../components/landing/TailsSection";
import CTAFooter from "../components/landing/CTAFooter";
import { PetDetailModal } from "../components/adopter/PetDetailPanel";

const API = import.meta.env.VITE_BACKEND_URL;

// Only pets an adopter can actually apply for (same rule as the adopter's Browse Pets)
const AVAILABLE_PETS_URL = "/api/animals?availabilityStatus=available&adoptionStatus=available";

const DAY_MS = 24 * 60 * 60 * 1000;

// A different pet with a photo each day, the same one for everyone all day.
// Sorted by id so a new arrival doesn't reshuffle today's pick.
function pickTodaysSpotlightPet(pets) {
    const petsWithPhotos = pets
        .filter((pet) => pet.image)
        .sort((a, b) => String(a._id).localeCompare(String(b._id)));

    if (petsWithPhotos.length === 0) return null;

    const now = new Date();
    const todayNumber = Math.floor(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS
    );

    return petsWithPhotos[todayNumber % petsWithPhotos.length];
}

export default function LandingPage({
    onLogin,
    onSignup,
}) {
    const [pets, setPets] = useState([]);
    // Without a backend URL there's nothing to wait for
    const [arePetsLoaded, setArePetsLoaded] = useState(!API);
    const [stats, setStats] = useState([]);
    const [openPet, setOpenPet] = useState(null);

    useEffect(() => {
        if (!API) return undefined;

        let cancelled = false;
        const headers = { "ngrok-skip-browser-warning": "true" };

        async function loadLandingData() {
            try {
                const [availableResponse, allResponse] = await Promise.all([
                    fetch(API + AVAILABLE_PETS_URL, { headers }),
                    fetch(API + "/api/animals", { headers }),
                ]);
                const availableData = await availableResponse.json();
                const allData = await allResponse.json();

                if (cancelled || !availableData.success || !allData.success) return;

                const availablePets = availableData.animals.map(toPetProfile);
                const adoptedCount = allData.animals.filter((animal) => animal.adoptionStatus === "adopted").length;

                setPets(availablePets);

                // Zeros look like an empty shelter, so only numbers above 0 are shown
                setStats(
                    [
                        { value: adoptedCount, label: "Pets Adopted" },
                        { value: availablePets.length, label: "Waiting for a Home" },
                        { value: allData.animals.length, label: "Rescues Cared For" },
                    ].filter((item) => item.value > 0)
                );
            } catch (error) {
                console.error("Failed to load landing page data:", error);
            } finally {
                if (!cancelled) setArePetsLoaded(true);
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

            <img className="page-paws" src={assets.images.pawTrail} alt="" aria-hidden="true" />
            <img className="page-paws-bottom" src={assets.images.pawTrail} alt="" aria-hidden="true" />
            <img className="page-paws-footer" src={assets.images.pawTrail} alt="" aria-hidden="true" />
            <img className="page-paws-footer-bottom1" src={assets.images.pawTrail} alt="" aria-hidden="true" />

            <HeroSection
                spotlightPet={pickTodaysSpotlightPet(pets)}
                onOpenPet={setOpenPet}
                onSignup={onSignup}
            />

            <RescueSection
                pets={pets}
                isLoading={!arePetsLoaded}
                onOpenPet={setOpenPet}
                onSignup={onSignup}
            />

            {stats.length > 0 && <StatsBand stats={stats} />}

            <AdoptionSteps />

            <NeedsSection onSignup={onSignup} />

            <FeatureSection />

            <GISSection onSignup={onSignup} />

            <HeartsCodeSection />

            <TailsSection />

            <CTAFooter onLogin={onLogin} onSignup={onSignup} />

            {openPet && (
                <PetDetailModal
                    pet={openPet}
                    onApply={onSignup}
                    onClose={() => setOpenPet(null)}
                />
            )}
        </main>
    );
}
