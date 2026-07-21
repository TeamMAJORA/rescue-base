import { useEffect, useRef, useState } from "react";
import "./styles/App.css";
import './animations/AppAnimation.css'
import assets from "./data/assets.json";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/adopter/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import FosterDashboard from "./pages/foster/FosterDashboard";

const API = import.meta.env.VITE_BACKEND_URL;

// Fallback sample pets shown while real data is loading (or if the API has nothing yet).
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

const adoptionSteps = [
    {
        icon: assets.icons.pawSearch,
        title: "Take the Match Quiz",
        text: "Hey!, Answer a few fun questions about your lifestyle. Our AI finds pets that fit you.",
    },
    {
        icon: assets.icons.redHeart,
        title: "Meet Your Matches",
        text: "Browse your personalized pet gallery with safe profiles, photos, and personality breakdowns.",
    },
    {
        icon: assets.icons.home,
        title: "Apply & Bring Them Home",
        text: "Submit yor application in minutes. Our staff guides you through every step of your journey.",
    },
];

const features = [//ewam ko dito pero pacheck nga baka may syntax error tuh
    {
        icon: assets.icons.pawSearch,
        title: "AI-Powered Matching",
        text: "Our quiz algorithm analyzes your lifestyle, experience, and home setup to find your most compatible pets first-.",
    },
    {
        icon: assets.icons.passport,
        title: "Digital Pet Passport",
        text: "Every animal has a complete medical history, vaccination records, and personality notes all in one place.",
    },
    {
        icon: assets.icons.home,
        title: "Guardian Watch",
        text: "Our in-house AI care monitoring watches out for common issues before adoption.",
    },
    {
        icon: assets.icons.redHeart,
        title: "Real-Time Analytics",
        text: "Shelter managers get live dashboards, intake trends, adoption rates, and donation stats that shows the impact of peaoples help.",
    },
];

function Header({ onLogin, onSignup }) {
    return (
        <header className="header">
            <a className="brand" href="/">
                <img src={assets.logo} alt="RescueBase logo" />
                <span>RescueBase</span>
            </a>

            <nav className="nav">
                <a href="#about">About Us</a>
                <img src={assets.icons.redPaw} alt="" />
                <a href="#pets">Browse Pets</a>
                <img src={assets.icons.redPaw} alt="" />
            </nav>

            <div className="header-actions">
                <button className="login-btn" type="button" onClick={onLogin}>
                    <img src={assets.icons.yellowPaw} alt="" />
                    Log in
                </button>

                <button className="start-btn" type="button" onClick={onSignup}>
                    <img src={assets.icons.yellowPaw} alt="" />
                    Get Started
                </button>
            </div>
        </header>
    );
}

function PetCard({ pet }) {
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

function PetSlider({ pets }) {
    const trackRef = useRef(null);

    const scrollByCard = (direction) => {
        const track = trackRef.current;
        if (!track) return;

        const firstSlide = track.querySelector(".pet-slide");
        const slideWidth = firstSlide ? firstSlide.getBoundingClientRect().width : 261;

        track.scrollBy({ left: direction * (slideWidth + 32), behavior: "smooth" });
    };

    return (
        <div className="pet-slider">
            <button
                className="pet-slider-arrow pet-slider-prev"
                type="button"
                onClick={() => scrollByCard(-1)}
                aria-label="Previous pets"
            >
                ‹
            </button>

            <div className="pet-track" ref={trackRef}>
                {pets.map((pet) => (
                    <div className="pet-slide" key={pet.id || pet.name}>
                        <PetCard pet={pet} />
                    </div>
                ))}
            </div>

            <button
                className="pet-slider-arrow pet-slider-next"
                type="button"
                onClick={() => scrollByCard(1)}
                aria-label="Next pets"
            >
                ›
            </button>
        </div>
    );
}

function StatsBand({ stats }) {
    return (
        <section className="stats-band">
            {stats.map((item) => (
                <div className="stat-item" key={item.label}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                </div>
            ))}
        </section>
    );
}

function AdoptionSteps() {
    return (
        <section className="steps-section">
            <div className="section-heading">
                <h2>Adoption in three steps</h2>
                <p>We've made finding your forever pet as joyful as the moment you meet them.</p>
            </div>

            <div className="steps-grid">
                {adoptionSteps.map((steps, index) => (
                    <article className="step-card" key={steps.title}>
                        <img src={steps.icon} alt="" />
                        <h3>{steps.title}</h3>
                        <p>{steps.text}</p>

                        {index < adoptionSteps.length - 1 && (
                            <img src={assets.icons.stepArrow} alt="" className="step-arrow" />
                        )}
                    </article>
                ))}
            </div>

        </section>
    );
}

function FeatureSection() {
    return (
        <section className="features-section">
            <div className="section-heading">
                <h2>More than an adoption site</h2>
                <p>A complete platform for adopters, shelter staff, and managers — all connected.</p>
            </div>

            <div className="features-grid">
                {features.map((feature) => (
                    <article className="feature-card" key={feature.title}>
                        <img src={feature.icon} alt="" />
                        <div>
                            <h3>{feature.title}</h3>
                            <p>{feature.text}</p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

function CTAFooter() {
    return (
        <section className="cta-footer" id="about">
            <img className="cta-pets" src={assets.images.bannerPets} alt="" />

            <div className="cta-content">
                <h2>
                    From Rescue to Forever <span>Home</span>
                </h2>

                <p>It takes five minutes to take the quiz. It takes a lifetime to love them.</p>

                <div className="cta-actions">
                    <button className="match-btn cta-match-btn" type="button">
                        Find my Match
                        <img src={assets.icons.heart} alt="" />
                    </button>

                    <button className="outline-btn" type="button" >
                        Support a Shelter
                    </button>
                </div>
            </div>

            <footer className="footer">
                <div className="footer-brand">
                    <h3>RescueBase</h3>
                    <p>
                        A smart, joyful platform that makes pet adoption feel less scary —
                        for shelters and adopters.
                    </p>
                </div>

                <div>
                    <h4>For Adopters</h4>
                    <a href="#pets">Browse Pets</a>
                    <a href="#pets">Match Quiz</a>
                    <a href="#pets">How it Works</a>
                </div>

                <div>
                    <h4>For Shelters</h4>
                    <a href="#about">Staff Portal</a>
                    <a href="#about">Pet Passport</a>
                    <a href="#about">Guardian Watch</a>
                </div>
            </footer>

            <div className="footer-bottom">
                <div>
                    <a href="#privacy">Privacy</a>
                    <a href="#terms">Terms</a>
                    <a href="#contact">Contact</a>
                </div>

                <span>©2025 RescueBase. All Rights Reserved.</span>
            </div>
        </section>
    );
}

// Formats an Animal document from the API TO PETCARD.
function formatPetForCard(animal) {
    const ageLabel = animal.age
        ? animal.age + (animal.age === 1 ? " year" : " years")
        : "Age unknown";

    const hasRealImage = typeof animal.image === "string" && animal.image.trim().length > 0;

    return {
        id: animal._id,
        name: animal.name,
        breed: animal.breed || animal.type || "Mixed",
        age: ageLabel,
        tag: animal.type || "Pet",
        image: hasRealImage ? animal.image : assets.images.authPets,
    };
}

export default function App() {
    const [page, setPage] = useState("home");

    const [pets, setPets] = useState([]);
    const [stats, setStats] = useState([
        { value: "—", label: "Pets Adopted" },
        { value: "—", label: "Pets Available" },
        { value: "—", label: "Active Foster Caregivers" },
        { value: "—", label: "Total Rescues" },
    ]);

    useEffect(() => {
        if (page !== "home" || !API) return;

        let cancelled = false;

        async function loadLandingData() {
            try {
                const [animalsRes, fosterRes] = await Promise.all([
                    fetch(API + "/api/animals"),
                    fetch(API + "/api/foster/assignments"),
                ]);

                const animalsData = await animalsRes.json();
                const fosterData = await fosterRes.json();

                if (cancelled) return;

                const animals = animalsData.success ? animalsData.animals : [];
                const assignments = fosterData.success ? fosterData.assignments : [];

                const available = animals.filter((a) => a.availabilityStatus === "available");
                const adoptedCount = animals.filter((a) => a.adoptionStatus === "adopted").length;
                const activeFosterCount = assignments.filter((a) => a.status === "active").length;

                setPets(available.slice(0, 8).map(formatPetForCard));

                setStats([
                    { value: String(adoptedCount), label: "Pets Adopted" },
                    { value: String(available.length), label: "Pets Available" },
                    { value: String(activeFosterCount), label: "Active Foster Caregivers" },
                    { value: String(animals.length), label: "Total Rescues" },
                ]);
            } catch (error) {
                console.error("Failed to load landing page data:", error);
            }
        }

        loadLandingData();

        return () => {
            cancelled = true;
        };
    }, [page]);

    if (page === "auth" || page === "login") {
        return (
            <AuthPage
                mode="login"
                setPage={setPage}
            />
        );
    }

    if (page === "signup") {
        return (
            <AuthPage
                mode="signup"
                setPage={setPage}
            />
        );
    }

    if (page === "dashboard") {
        return (
            <Dashboard
                onLogout={() => setPage("home")}
            />
        );
    }

    if (page === "foster") {
        return <FosterDashboard setPage={setPage} />
    }

    if (page === "admin") {
        return <AdminDashboard setPage={setPage} />
    }

    return (
        <main className="app">
            <Header onLogin={() => setPage("auth")} onSignup={() => setPage("signup")} />

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

                    <p>Helping every rescued pet find a loving family faster.</p>

                    <button className="match-btn" type="button" onClick={() => setPage("signup")}>
                        Find my Match
                        <img src={assets.icons.heart} alt="" />
                    </button>
                </div>
            </section>

            <section className="pets-section" id="pets">
                <div className="section-heading">
                    <h2>Meet some of our rescues</h2>
                    <p>Every one of them is waiting for you.</p>
                </div>

                <a className="see-all-pets" href="#pets" onClick={(e) => { e.preventDefault(); setPage("signup"); }}>
                    See All Pets →
                </a>

                <PetSlider pets={pets.length > 0 ? pets : samplePets} />

                <p className="pet-note">
                    Sign in to see all available pets and start your application
                </p>

                <div className="pet-actions">
                    <button className="adopt-btn" type="button" onClick={() => setPage("signup")}>
                        Adopt
                        <img src={assets.icons.adopt} alt="" />
                    </button>

                    <button className="donate-btn" type="button" onClick={() => setPage("signup")}>
                        Donate
                        <img src={assets.icons.donate} alt="" />
                    </button>
                </div>
            </section>

            <StatsBand stats={stats} />
            <AdoptionSteps />
            <FeatureSection />
            <CTAFooter />
        </main>
    );
}
