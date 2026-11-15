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
import SpotlightSection from "../components/landing/SpotlightSection";
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

export default function LandingPage({
    onLogin,
    onSignup,
}) {
    const [pets, setPets] = useState([]);
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
                featuredPet={pets[0]}
                onOpenPet={setOpenPet}
                onSignup={onSignup}
            />

            <RescueSection pets={pets} onOpenPet={setOpenPet} />

            {stats.length > 0 && <StatsBand stats={stats} />}

            <AdoptionSteps />

            {pets[1] && (
                <SpotlightSection
                    pet={pets[1]}
                    onOpenPet={setOpenPet}
                    onSignup={onSignup}
                />
            )}

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
